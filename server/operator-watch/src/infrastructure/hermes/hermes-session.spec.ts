import { AgentEnvelope } from '../../domain/workspace/types/repositories/workspace.ports';
import { formatHermesMessage } from './hermes-envelope';
import { operatorSessionId, HermesSessionClient } from './hermes-session.client';
import { HermesAgentNotifier } from './hermes-agent.notifier';
import { HermesSessionTrigger } from './hermes-session.trigger';

type Call = { method: string; url: string; body?: any };
const res = (status: number, json: unknown = {}) => ({ ok: status < 300, status, json: async () => json, text: async () => JSON.stringify(json) });

function fakeHermes(sessions = new Set<string>()) {
  const calls: Call[] = [];
  const fetchFn = async (url: string, init: { method: string; body?: string; headers: Record<string, string> }) => {
    const path = new URL(url).pathname;
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ method: init.method, url: path, body });
    expect(init.headers.authorization).toBe('Bearer key');
    if (path === '/api/sessions') return sessions.has(body.id) ? res(409) : (sessions.add(body.id), res(201));
    const chat = path.match(/^\/api\/sessions\/([^/]+)\/chat$/);
    if (chat) return sessions.has(decodeURIComponent(chat[1])) ? res(200, { message: { role: 'assistant', content: `re: ${body.message}` } }) : res(404);
    return res(404);
  };
  return { calls, sessions, client: new HermesSessionClient('http://hermes:1', 'key', fetchFn as never) };
}

const env = (operatorId: string, text: string, kind: AgentEnvelope['kind'] = 'chat'): AgentEnvelope => ({ operatorId, kind, text });

describe('Hermes operator sessions', () => {
  it('uses one deterministic session per operator, creating it once', async () => {
    const { client, calls } = fakeHermes();
    expect(operatorSessionId('D-1')).toBe('opw-D-1');
    expect(await client.send(env('D-1', 'hi'), 'Acme')).toBe('re: [[operator:D-1]] [[kind:chat]]\n\nhi');
    await client.send(env('D-1', 'again'), 'Acme');
    expect(calls.filter((c) => c.url === '/api/sessions')).toHaveLength(1);
    expect(calls.filter((c) => c.url === '/api/sessions/opw-D-1/chat')).toHaveLength(2);
  });

  it('recreates a session that was deleted on the Hermes side', async () => {
    const { client, sessions } = fakeHermes();
    await client.send(env('D-1', 'hi'), 'Acme');
    sessions.delete('opw-D-1');
    expect(await client.send(env('D-1', 'hi again'), 'Acme')).toBe('re: [[operator:D-1]] [[kind:chat]]\n\nhi again');
  });

  it('is unconfigured without URL and key', () => {
    expect(new HermesSessionClient('', '').configured).toBe(false);
  });

  it('fans a run out to each operator session and reports failures', async () => {
    const { client, calls } = fakeHermes();
    const trigger = new HermesSessionTrigger(client, 2);
    const dispatch = await trigger.trigger(
      { runId: 'r1', label: '2026-W40', snapshotId: 's', operatorCount: 3, operators: [{ id: 'A', name: 'A' }, { id: 'B', name: 'B' }, { id: 'C', name: 'C' }], trigger: 'manual' },
      { agent: { playbookVersion: 'pb' } } as never,
    );
    expect(await dispatch.finished).toContain('3 of 3');
    const chats = calls.filter((c) => c.url.endsWith('/chat'));
    expect(chats.map((c) => c.url).sort()).toEqual(['/api/sessions/opw-A/chat', '/api/sessions/opw-B/chat', '/api/sessions/opw-C/chat']);
    expect(chats[0].body.message).toContain('run_id r1');
  });

  it('serializes sends to one session and lets other sessions run in parallel', async () => {
    const order: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const fetchFn = async (url: string, init: { body?: string }) => {
      const path = new URL(url).pathname;
      if (path === '/api/sessions') return res(201);
      const text = JSON.parse(init.body!).message as string;
      order.push(`start ${path} ${text.split('\n\n')[1]}`);
      if (text.endsWith('slow')) await gate;
      order.push(`end ${path} ${text.split('\n\n')[1]}`);
      return res(200, { message: { content: 'ok' } });
    };
    const client = new HermesSessionClient('http://hermes:1', 'key', fetchFn as never);
    const slow = client.send(env('A', 'slow'));
    const note = client.send(env('A', 'note', 'decision'));
    const other = client.send(env('B', 'other'));
    await other;
    expect(order).toEqual(['start /api/sessions/opw-A/chat slow', 'start /api/sessions/opw-B/chat other', 'end /api/sessions/opw-B/chat other']);
    release();
    await Promise.all([slow, note]);
    expect(order.slice(3)).toEqual(['end /api/sessions/opw-A/chat slow', 'start /api/sessions/opw-A/chat note', 'end /api/sessions/opw-A/chat note']);
  });

  it('keeps the chain alive after a failed send', async () => {
    let n = 0;
    const fetchFn = async (url: string) => (new URL(url).pathname === '/api/sessions' ? res(201) : ++n === 1 ? res(500) : res(200, { message: { content: 'ok' } }));
    const client = new HermesSessionClient('http://hermes:1', 'key', fetchFn as never);
    const first = client.send(env('A', 'one'));
    const second = client.send(env('A', 'two'));
    await expect(first).rejects.toThrow('500');
    await expect(second).resolves.toBe('ok');
  });
});

describe('HermesAgentNotifier', () => {
  const sendMock = () => {
    const sent: AgentEnvelope[] = [];
    const sessions = { send: jest.fn(async (e: AgentEnvelope) => void sent.push(e)) };
    return { sent, sessions };
  };

  it('renders a reject with its reason as a record-only decision', async () => {
    const { sent, sessions } = sendMock();
    await new HermesAgentNotifier(sessions as never, 3, 0).notify({ type: 'decision', operatorId: 'D-1', caseRef: 'M1', decision: 'reject', actor: 'Ann', reason: 'wrong tone' });
    expect(sent).toEqual([{ operatorId: 'D-1', kind: 'decision', text: expect.stringContaining('Record only') }]);
    expect(sent[0].text).toContain('Decision on case M1: REJECTED by Ann. Reason: wrong tone');
  });

  it('renders an approve-with-edit with both drafts, and email events as kind email', async () => {
    const { sent, sessions } = sendMock();
    const notifier = new HermesAgentNotifier(sessions as never, 3, 0);
    await notifier.notify({ type: 'decision', operatorId: 'D-1', caseRef: 'M1', decision: 'approve', actor: 'Ann', edit: { agentBody: 'old', finalBody: 'new' } });
    await notifier.notify({ type: 'email', operatorId: 'D-1', caseRef: 'M1', outcome: 'sent', text: 'Email sent' });
    expect(sent[0].text).toContain('APPROVED by Ann');
    expect(sent[0].text).toContain('Agent draft:\nold\nFinal approved by human:\nnew');
    expect(sent[1]).toMatchObject({ kind: 'email' });
  });

  it('retries up to three times, then gives up without throwing', async () => {
    const sessions = { send: jest.fn(async () => { throw new Error('down'); }) };
    await expect(new HermesAgentNotifier(sessions as never, 3, 0).notify({ type: 'email', operatorId: 'D-1', outcome: 'failed', text: 't' })).resolves.toBeUndefined();
    expect(sessions.send).toHaveBeenCalledTimes(3);
    const flaky = { send: jest.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue('ok') };
    await new HermesAgentNotifier(flaky as never, 3, 0).notify({ type: 'email', operatorId: 'D-1', outcome: 'sent', text: 't' });
    expect(flaky.send).toHaveBeenCalledTimes(2);
  });
});
