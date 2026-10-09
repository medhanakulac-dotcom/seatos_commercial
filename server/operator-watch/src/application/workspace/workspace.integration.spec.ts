import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../../app.module';
import { AUTH_REPOSITORY, InMemoryAuthRepository, Role } from '../../auth/auth.repository';
import { IDENTITY_VERIFIER, StaticIdentityVerifier } from '../../auth/identity.verifier';
import { AGENT_TRIGGER, TMS_DIRECTORY } from '../../domain/workspace/types/repositories/workspace.ports';

type Method = 'GET' | 'POST' | 'PUT';
const AGENT_TOKEN = 'test-agent-token-0123456789';

/** Runs against the in-memory store and mock CRM (no DATABASE_URL, CRM_SOURCE unset). */
describe('Workspace HTTP integration', () => {
  let app: NestFastifyApplication;
  const tokens: Partial<Record<Role, string>> = {};
  const saved = { ...process.env };
  const triggered: string[] = [];
  let tmsMatches: { tmsOperatorId: number; name: string; active: boolean; domain: string | null }[] = [];

  const call = (method: Method, url: string, role?: Role, payload?: unknown, headers: Record<string, string> = {}) =>
    app.getHttpAdapter().getInstance().inject({
      method,
      url,
      headers: { ...(role ? { authorization: tokens[role] } : {}), ...(payload !== undefined ? { 'content-type': 'application/json' } : {}), ...headers },
      payload: payload === undefined ? undefined : typeof payload === 'string' ? payload : JSON.stringify(payload),
    });

  const mcp = (body: unknown, token = AGENT_TOKEN) =>
    app.getHttpAdapter().getInstance().inject({
      method: 'POST',
      url: '/mcp',
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: `Bearer ${token}` },
      payload: JSON.stringify(body),
    });
  const tool = async (name: string, args: Record<string, unknown>) => {
    const res = await mcp({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } });
    const result = res.json().result as { content: { text: string }[]; isError?: boolean };
    return { isError: !!result.isError, data: result.isError ? result.content[0].text : JSON.parse(result.content[0].text) };
  };

  beforeAll(async () => {
    for (const k of ['DATABASE_URL', 'CRM_SOURCE', 'HUBSPOT_ACCESS_TOKEN', 'SMTP_HOST', 'HERMES_WEBHOOK_SECRET']) delete process.env[k];
    process.env.WORKSPACE_WORKERS = 'false';
    process.env.AGENT_API_TOKEN = AGENT_TOKEN;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      // Stand-in for the Hermes webhook: records the run instead of calling out.
      .overrideProvider(TMS_DIRECTORY)
      .useValue({ connected: true, findOperators: async () => tmsMatches })
      .overrideProvider(AGENT_TRIGGER)
      .useValue({ trigger: async (e: { runId: string }) => void triggered.push(e.runId) })
      .compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    const repo = app.get<InMemoryAuthRepository>(AUTH_REPOSITORY);
    for (const role of ['admin', 'analyst', 'viewer'] as const) {
      const user = await repo.upsertUser({ subject: `${role}-sub`, email: `${role}.user@seatos.com`, role });
      tokens[role] = app.get<StaticIdentityVerifier>(IDENTITY_VERIFIER).add(`${role}-token`, { sub: user.subject, email: user.email });
    }
  });

  afterAll(async () => {
    await app.close();
    process.env = saved;
  });

  it('requires a session', async () => {
    expect((await call('GET', '/workspace/accounts')).statusCode).toBe(401);
  });

  it('bootstraps a local run and lists every CRM account with its case', async () => {
    const res = await call('GET', '/workspace/accounts', 'viewer');
    expect(res.statusCode).toBe(200);
    const { items } = res.json();
    expect(items.length).toBeGreaterThan(40);
    expect(items.filter((a: { state: string }) => a.state === 'pending').length).toBeGreaterThan(0);
    const meta = (await call('GET', '/workspace/meta', 'viewer')).json();
    expect(meta).toMatchObject({ run: { status: 'completed', agent: 'local' }, sending: { enabled: false, channels: [{ id: 'smtp' }] } });
  });

  it('lets viewers read but not review, and only admins configure', async () => {
    const { items } = (await call('GET', '/workspace/accounts', 'viewer')).json();
    const target = items.find((a: { drafted: boolean; state: string }) => a.drafted && a.state === 'pending');
    expect((await call('POST', `/workspace/accounts/${target.id}/decision`, 'viewer', { decision: 'approve' })).statusCode).toBe(403);
    expect((await call('GET', '/admin/settings', 'analyst')).statusCode).toBe(403);
    expect((await call('GET', '/admin/settings', 'admin')).statusCode).toBe(200);
  });

  it('approves a drafted case to the chosen channel and recipient and lists the queued email', async () => {
    const { items } = (await call('GET', '/workspace/accounts', 'analyst')).json();
    const target = items.find((a: { drafted: boolean; state: string }) => a.drafted && a.state === 'pending');
    const res = await call('POST', `/workspace/accounts/${target.id}/decision`, 'analyst', { decision: 'approve', channel: 'smtp', recipient: 'owner@operator.example' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ state: 'approved', sendJobs: [{ channel: 'smtp', recipient: 'owner@operator.example', status: 'queued' }] });
    expect(res.json().events.at(-1).text).toMatch(/^Approved by Analyst User · via Email server \(SMTP\) to owner@operator.example/);
    const sent = (await call('GET', '/workspace/sent', 'analyst')).json();
    expect(sent.items).toEqual(expect.arrayContaining([expect.objectContaining({ accountId: target.id, status: 'queued', draftHash: res.json().draft.hash })]));
  });

  it('rejects non-JSON mutations, bad channels and bad recipients', async () => {
    const { items } = (await call('GET', '/workspace/accounts', 'analyst')).json();
    const id = items[0].id;
    const form = await app.getHttpAdapter().getInstance().inject({ method: 'POST', url: `/workspace/accounts/${id}/decision`, headers: { authorization: tokens.analyst!, 'content-type': 'application/x-www-form-urlencoded' }, payload: 'decision=approve' });
    expect(form.statusCode).toBe(415);
    expect((await call('POST', `/workspace/accounts/${id}/decision`, 'analyst', { decision: 'approve', channel: 'fax' })).statusCode).toBe(400);
    expect((await call('POST', `/workspace/accounts/${id}/decision`, 'analyst', { decision: 'approve', recipient: 'nope' })).statusCode).toBe(400);
    expect((await call('POST', `/workspace/accounts/${id}/decision`, 'analyst', { decision: 'hold', channel: 'smtp' })).statusCode).toBe(400);
  });

  it('maps domain errors to 404 and 409', async () => {
    expect((await call('GET', '/workspace/accounts/D-000000', 'viewer')).statusCode).toBe(404);
    const { items } = (await call('GET', '/workspace/accounts', 'analyst')).json();
    const healthy = items.find((a: { state: string }) => a.state === 'healthy');
    expect((await call('POST', `/workspace/accounts/${healthy.id}/draft`, 'analyst', {})).statusCode).toBe(409);
  });

  it('resolves, confirms and reports the SeatOS operator link of an account', async () => {
    const { items } = (await call('GET', '/workspace/accounts', 'viewer')).json();
    const id = items[0].id as string;
    // The background pass after the run may or may not have looked this account up yet (the fake directory knows nothing).
    expect((await call('GET', `/workspace/accounts/${id}`, 'viewer')).json().tmsLink).toEqual({
      status: expect.stringMatching(/^(unresolved|not_found)$/), tmsOperatorId: null, tmsOperatorName: null, source: null, candidates: [], confirmedBy: null,
    });

    tmsMatches = [{ tmsOperatorId: 11, name: 'Alpha Tours', active: true, domain: 'alpha.seatos.com' }, { tmsOperatorId: 12, name: 'Alpha Tours 2', active: false, domain: null }];
    const resolved = await call('POST', `/workspace/accounts/${id}/tms-link/resolve`, 'analyst', {});
    expect(resolved.statusCode).toBe(200);
    expect(resolved.json().tmsLink).toMatchObject({ status: 'needs_confirmation', tmsOperatorId: null, candidates: [{ tmsOperatorId: 11, name: 'Alpha Tours', active: true, domain: 'alpha.seatos.com' }, { tmsOperatorId: 12 }] });

    expect((await call('POST', `/workspace/accounts/${id}/tms-link`, 'viewer', { tmsOperatorId: 11 })).statusCode).toBe(403);
    expect((await call('POST', `/workspace/accounts/${id}/tms-link`, 'analyst', { tmsOperatorId: '11' })).statusCode).toBe(400);
    expect((await call('POST', `/workspace/accounts/${id}/tms-link`, 'analyst', { tmsOperatorId: 99 })).statusCode).toBe(400);
    const confirmed = await call('POST', `/workspace/accounts/${id}/tms-link`, 'analyst', { tmsOperatorId: 12 });
    expect(confirmed.statusCode).toBe(200);
    expect(confirmed.json().tmsLink).toMatchObject({ status: 'linked', tmsOperatorId: 12, source: 'human', confirmedBy: 'Analyst User' });
    tmsMatches = [];
  });

  it('validates admin settings and never returns secrets', async () => {
    const { settings, server } = (await call('GET', '/admin/settings', 'admin')).json();
    expect(server).toMatchObject({ crmSource: 'mock', database: false, agentApiToken: true, smtp: false, smtpVerified: null, smtpError: null });
    expect(JSON.stringify(server)).not.toContain(AGENT_TOKEN);
    const bad = await call('PUT', '/admin/settings', 'admin', { settings: { ...settings, pipeline: { ...settings.pipeline, cadence: 'hourly' } } });
    expect(bad.statusCode).toBe(400);
    expect(bad.json().message).toContain('pipeline.cadence');
    const good = await call('PUT', '/admin/settings', 'admin', { settings: { ...settings, pipeline: { ...settings.pipeline, cadence: 'daily', time: '06:30' } } });
    expect(good.json().settings.pipeline).toMatchObject({ cadence: 'daily', time: '06:30' });
  });

  it('verifies the SMTP connection on demand (admin only) and reports when it is not configured', async () => {
    expect((await call('POST', '/admin/sending/verify', 'analyst', {})).statusCode).toBe(403);
    const res = await call('POST', '/admin/sending/verify', 'admin', {});
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: false, error: 'Email server (SMTP) is not configured on the server' });
  });

  it('starts a manual run from the admin API and expires the previous run’s open cases', async () => {
    const before = (await call('GET', '/workspace/meta', 'viewer')).json().run.id;
    const res = await call('POST', '/admin/runs', 'admin', {});
    expect(res.statusCode).toBe(200);
    expect(res.json().run.id).not.toBe(before);
    const runs = (await call('GET', '/admin/runs', 'admin')).json().items;
    expect(runs[0]).toMatchObject({ status: 'completed', outreach: expect.any(Number) });
    const leader = (await call('GET', '/workspace/leader', 'viewer')).json();
    expect(leader.lastWeek.rows.reduce((n: number, r: { expired: number }) => n + r.expired, 0)).toBeGreaterThan(0);
  });

  it('protects the MCP endpoint and lets the agent read operators and submit cases', async () => {
    expect((await mcp({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, 'wrong-token')).statusCode).toBe(401);
    const list = await mcp({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
    expect(list.statusCode).toBe(200);
    expect(list.json().result.tools.map((t: { name: string }) => t.name)).toEqual(['find_operators', 'get_weekly_numbers', 'list_weekly_numbers', 'get_hubspot_activity', 'get_current_run', 'list_operators', 'get_operator', 'get_operator_context', 'submit_case', 'submit_cases', 'complete_run', 'fail_run']);

    // Switch to Hermes mode so the run stays open for agent submissions.
    const { settings } = (await call('GET', '/admin/settings', 'admin')).json();
    await call('PUT', '/admin/settings', 'admin', { settings: { ...settings, agent: { mode: 'hermes', webhookUrl: 'http://hermes.invalid/webhooks/ow', playbookVersion: 'pb-1' } } });
    const run = (await call('POST', '/admin/runs', 'admin', {})).json().run;
    expect(triggered).toEqual([run.id]);
    expect((await tool('get_current_run', {})).data).toMatchObject({ run_id: run.id, status: 'running', cases_submitted: 0 });

    const ops = await tool('list_operators', { run_id: run.id, limit: 300 });
    const target = ops.data.operators.find((o: { segment: string; health: string }) => o.segment === 'High' && o.health === 'Unhealthy');
    const detail = await tool('get_operator', { run_id: run.id, operator_id: target.operator_id });
    expect(detail.data.previous_cases.length).toBeGreaterThan(0);

    // Operator-first lookup for chat: no run_id needed, and unknown operators are a tool error, not a crash.
    const context = await tool('get_operator_context', { operator_id: target.operator_id });
    expect(context.data).toMatchObject({ run: { id: run.id }, operator: { id: target.operator_id } });
    expect(context.data.cases.length).toBeGreaterThan(0);
    expect((await tool('get_operator_context', { operator_id: 'D-nope' })).isError).toBe(true);

    const submitted = await tool('submit_case', {
      run_id: run.id,
      operator_id: target.operator_id,
      needs_outreach: true,
      analysis: 'Bookings fell 30% after the fare change.',
      playbook: 'Rescue',
      signals: [{ detector: 'Volume', text: 'Volume −30% WoW' }],
      draft: { subject: 'Your bookings this week', body: 'Hi team,\n\nWe noticed…', language: 'en' },
    });
    expect(submitted).toMatchObject({ isError: false, data: { outcome: 'outreach', state: 'pending', draftVersion: 1 } });

    const account = (await call('GET', `/workspace/accounts/${target.operator_id}`, 'viewer')).json();
    expect(account).toMatchObject({ state: 'pending', author: 'agent:hermes', draft: { writer: 'agent', subject: 'Your bookings this week' }, signals: [{ code: 'ANL-1', text: 'Volume −30% WoW' }] });

    const others = ops.data.operators.filter((o: { operator_id: string }) => o.operator_id !== target.operator_id).slice(0, 3);
    const batch = await tool('submit_cases', {
      run_id: run.id,
      cases: [
        ...others.map((o: { operator_id: string }) => ({ operator_id: o.operator_id, needs_outreach: false, analysis: 'Stable', reason: 'Nothing to act on' })),
        { operator_id: 'D-nope', needs_outreach: false, analysis: 'x' },
      ],
    });
    expect(batch.data).toMatchObject({ submitted: 3, failed: 1 });
    expect(batch.data.results[3]).toMatchObject({ operator_id: 'D-nope', ok: false, error: expect.stringContaining('not found') });

    const invalid = await tool('submit_case', { run_id: run.id, operator_id: 'D-nope', needs_outreach: false, analysis: 'x' });
    expect(invalid).toMatchObject({ isError: true, data: expect.stringContaining('not found') });
    expect((await tool('complete_run', { run_id: run.id, summary: '1 operator needs outreach' })).data).toEqual({ status: 'completed' });
  });
});
