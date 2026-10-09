import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../../app.module';
import { AUTH_REPOSITORY, InMemoryAuthRepository, Role } from '../../auth/auth.repository';
import { IDENTITY_VERIFIER, StaticIdentityVerifier } from '../../auth/identity.verifier';
import { AGENT_MEMORY_STORE, TMS_DIRECTORY } from '../../domain/workspace/types/repositories/workspace.ports';
import { InMemoryAgentStore } from '../workspace-mocks/in-memory-agent.store';
import { ClaudeLike } from './claude.client';
import { ASSESS_SYSTEM, CHAT_SYSTEM, MEMORY_SYSTEM, REWRITE_SYSTEM } from './claude.prompts';
import { CLAUDE } from './claude.tokens';

type Method = 'GET' | 'POST' | 'PUT';

/** A stand-in for the Messages API: answers by which prompt it was given, and records what it was sent. */
class FakeClaude implements ClaudeLike {
  readonly calls: { system: string; user: string }[] = [];
  readonly chats: { messages: unknown[]; tools: string[] }[] = [];
  failOperator?: string;

  async structured<T>({ system, user }: { system: string; user: string }): Promise<T> {
    this.calls.push({ system, user });
    if (system === ASSESS_SYSTEM) {
      if (this.failOperator && user.includes(this.failOperator)) throw new Error('model overloaded');
      const outreach = /"crmHealth":"(Unhealthy|Adopted)"/.test(user) && !/"segment":"Dormant"/.test(user);
      return {
        needs_outreach: outreach,
        analysis: 'Claude analysis from the snapshot.',
        reason: outreach ? undefined : 'Healthy or dormant: no email.',
        playbook: outreach ? 'Rescue' : 'Grow',
        play_type: 'Retention',
        language: 'en',
        signals: [{ detector: 'HubSpot health', text: 'Health status from the snapshot' }],
        draft: outreach ? { subject: 'Quick check-in', body: 'Hello from Claude', language: 'en' } : undefined,
      } as T;
    }
    if (system === MEMORY_SYSTEM) {
      const what = user.split('\n')[2] ?? '';
      return { facts: [{ text: `Remembered: ${what.slice(0, 80)}`, scope: 'operator', topics: ['outreach'] }], supersedes: [] } as T;
    }
    if (system === REWRITE_SYSTEM) return { subject: 'Shorter subject', body: 'Shorter body' } as T;
    throw new Error(`unexpected prompt: ${system.slice(0, 40)}`);
  }

  async converse({ system, messages, tools }: { system: string; messages: unknown[]; tools: { name: string }[] }): Promise<string> {
    expect(system).toBe(CHAT_SYSTEM);
    this.chats.push({ messages, tools: tools.map((t) => t.name) });
    return `Answer ${this.chats.length}`;
  }
}

const until = async (check: () => Promise<boolean>, ms = 5000) => {
  const end = Date.now() + ms;
  while (!(await check())) {
    if (Date.now() > end) throw new Error('timed out waiting');
    await new Promise((r) => setTimeout(r, 20));
  }
};

/** Claude mode end to end on the in-memory stores, with the model faked. */
describe('Claude agent HTTP integration', () => {
  let app: NestFastifyApplication;
  let memory: InMemoryAgentStore;
  const claude = new FakeClaude();
  const tokens: Partial<Record<Role, string>> = {};
  const saved = { ...process.env };

  const call = (method: Method, url: string, role: Role, payload?: unknown) =>
    app.getHttpAdapter().getInstance().inject({
      method,
      url,
      headers: { authorization: tokens[role], ...(payload !== undefined ? { 'content-type': 'application/json' } : {}) },
      payload: payload === undefined ? undefined : JSON.stringify(payload),
    });

  beforeAll(async () => {
    for (const k of ['DATABASE_URL', 'CRM_SOURCE', 'HUBSPOT_ACCESS_TOKEN', 'SMTP_HOST', 'HERMES_WEBHOOK_SECRET', 'HERMES_API_URL', 'TMS_TOOLS_MCP_URL']) delete process.env[k];
    process.env.WORKSPACE_WORKERS = 'false';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TMS_DIRECTORY)
      .useValue({ connected: false, findOperators: async () => [] })
      .overrideProvider(CLAUDE)
      .useValue(claude)
      .compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    const repo = app.get<InMemoryAuthRepository>(AUTH_REPOSITORY);
    for (const role of ['admin', 'analyst'] as const) {
      const user = await repo.upsertUser({ subject: `${role}-sub`, email: `${role}.user@seatos.com`, role });
      tokens[role] = app.get<StaticIdentityVerifier>(IDENTITY_VERIFIER).add(`${role}-token`, { sub: user.subject, email: user.email });
    }
    memory = app.get<InMemoryAgentStore>(AGENT_MEMORY_STORE);
  });

  afterAll(async () => {
    await app.close();
    process.env = saved;
  });

  it('reports the assistant and the email AI as connected', async () => {
    const meta = (await call('GET', '/workspace/meta', 'analyst')).json();
    expect(meta.capabilities).toMatchObject({ assistant: true, emailRewrite: true });
    expect((await call('GET', '/admin/settings', 'admin')).json().server).toMatchObject({ claude: false });
  });

  it('runs in Claude mode: queues every operator, assesses them, remembers the cases and completes the run', async () => {
    const { settings } = (await call('GET', '/admin/settings', 'admin')).json();
    const put = await call('PUT', '/admin/settings', 'admin', { settings: { ...settings, agent: { ...settings.agent, mode: 'claude' } } });
    expect(put.statusCode).toBe(200);

    const started = await call('POST', '/admin/runs', 'admin', {});
    expect(started.statusCode).toBe(200);
    const runId = started.json().run.id as string;
    expect(started.json().run.agent).toBe('claude');

    const runOf = async () => (await call('GET', '/admin/runs', 'admin')).json().items.find((r: { id: string }) => r.id === runId);
    await until(async () => (await runOf()).status !== 'running');
    const run = await runOf();
    expect(run.status).toBe('completed');
    expect(run.summary).toMatch(/^Claude assessed (\d+) of \1 operators\.$/);

    const assessed = claude.calls.filter((c) => c.system === ASSESS_SYSTEM);
    expect(assessed.length).toBe(run.cases);
    expect(assessed[0].user).toContain('Operator record:');

    const { items } = (await call('GET', '/workspace/accounts', 'analyst')).json();
    const drafted = items.find((a: { drafted: boolean; state: string }) => a.drafted && a.state === 'pending');
    const detail = (await call('GET', `/workspace/accounts/${drafted.id}`, 'analyst')).json();
    expect(detail.draft).toMatchObject({ subject: 'Quick check-in', body: 'Hello from Claude', writer: 'agent' });
    expect(memory.facts.filter((f) => f.kind === 'case').length).toBe(run.cases);
  });

  it('retries a failed assessment, then fails the run once attempts run out', async () => {
    const { items } = (await call('GET', '/workspace/accounts', 'analyst')).json();
    claude.failOperator = items[0].id;
    const runId = (await call('POST', '/admin/runs', 'admin', {})).json().run.id as string;
    const runOf = async () => (await call('GET', '/admin/runs', 'admin')).json().items.find((r: { id: string }) => r.id === runId);
    // Leases are minutes long, so later attempts come from later ticks: drive them like the scheduler would.
    const queue = memory;
    await until(async () => (await queue.progress(runId)).pending + (await queue.progress(runId)).working === 0 || (await runOf()).status !== 'running', 8000).catch(async () => {
      throw new Error(JSON.stringify(await queue.progress(runId)));
    });
    expect((await runOf()).status).toBe('failed');
    expect((await runOf()).error).toMatch(/1 have no case \(1 failed after 3 attempts\)/);
    claude.failOperator = undefined;
  });

  it('answers in the shared chat with history, memory and the operator lookup tool, then remembers the exchange', async () => {
    const { items } = (await call('GET', '/workspace/accounts', 'analyst')).json();
    const id = items[1].id as string;
    const first = await call('POST', `/workspace/accounts/${id}/assistant`, 'analyst', { question: 'How are they doing?' });
    expect(first.statusCode).toBe(200);
    expect(first.json().messages.at(-1)).toMatchObject({ role: 'assistant', authorName: 'Claude', text: 'Answer 1' });
    await call('POST', `/workspace/accounts/${id}/assistant`, 'admin', { question: 'And their deals?' });

    const second = claude.chats[1];
    expect(second.tools).toEqual(['get_operator_context']);
    const sent = JSON.stringify(second.messages);
    expect(sent).toContain('Analyst User: How are they doing?');
    expect(sent).toContain('Answer 1');
    expect(sent).toContain('Admin User asks: And their deals?');
    expect(sent).toContain('Context — ');
    expect(sent).toContain('What the team remembers');
    await until(async () => memory.facts.some((f) => f.kind === 'chat' && f.operatorId === id));
  });

  it('rewrites a draft from a prompt and remembers decisions', async () => {
    const { items } = (await call('GET', '/workspace/accounts', 'analyst')).json();
    const target = items.find((a: { drafted: boolean; state: string }) => a.drafted && a.state === 'pending');
    const res = await call('POST', `/workspace/accounts/${target.id}/draft/prompt`, 'analyst', { instruction: 'make it shorter' });
    expect(res.statusCode).toBe(200);
    const detail = (await call('GET', `/workspace/accounts/${target.id}`, 'analyst')).json();
    expect(detail.draft).toMatchObject({ subject: 'Shorter subject', body: 'Shorter body' });

    const hold = await call('POST', `/workspace/accounts/${target.id}/decision`, 'analyst', { decision: 'hold', reason: 'Owner is on leave' });
    expect(hold.statusCode).toBe(200);
    await until(async () => memory.facts.some((f) => f.kind === 'decision' && f.operatorId === target.id));
    const told = claude.calls.filter((c) => c.system === MEMORY_SYSTEM).map((c) => c.user).find((u) => u.includes('PUT ON HOLD'));
    expect(told).toContain('Reason: Owner is on leave');
  });
});
