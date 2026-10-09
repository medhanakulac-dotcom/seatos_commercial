import { AccountContext, AgentEnvelope } from '../../../domain/workspace/types/repositories/workspace.ports';
import { HermesAccountAssistant } from '../hermes-account.assistant';
import { HermesSessionClient } from '../hermes-session.client';
import { formatHermesMessage } from '../hermes-envelope';
import { buildOperatorBrief } from './operator-chat.brief';
import { operatorSystemPrompt } from './operator-chat.prompt';

const account = (over: Partial<AccountContext> = {}): AccountContext => ({
  id: 'D-1', name: 'Acme Bus', segment: 'High', health: 'Unhealthy', playbook: 'Rescue', owner: 'Ice', country: 'Thailand', state: 'pending',
  signals: ['No note in 26 days'], deals: [{ pipeline: 'Client Pipeline', stage: 'Fully Live (AM)', amount: 1200 }], activity: ['2026-09-01 · note'], ...over,
});

describe('operator chat framing', () => {
  it('keeps the system prompt focused on the operator and read-only', () => {
    const p = operatorSystemPrompt({ id: 'D-1', name: 'Acme Bus' });
    expect(p).toContain('Acme Bus');
    expect(p).toContain('D-1');
    expect(p).toMatch(/read-only/);
    expect(p).toContain('get_operator_context');
  });

  it('versions the brief by its facts', () => {
    const a = buildOperatorBrief(account());
    expect(buildOperatorBrief(account()).version).toBe(a.version);
    expect(buildOperatorBrief(account({ health: 'Healthy' })).version).not.toBe(a.version);
    expect(a.text).toContain('Rescue');
  });

  it('tells the agent the SeatOS operator id when known and versions the brief by it', () => {
    const plain = buildOperatorBrief(account());
    const linked = buildOperatorBrief(account({ tmsOperatorId: 26281 }));
    expect(linked.text).toContain('SeatOS operator_id: 26281 (use it directly with SeatOS tools; do not look the operator up by name)');
    expect(plain.text).not.toContain('SeatOS operator_id');
    expect(linked.version).not.toBe(plain.version);
  });

  it('puts the SeatOS id in the header of chat messages', async () => {
    const sent: string[] = [];
    const sessions = { configured: true, send: async (e: AgentEnvelope) => (sent.push(formatHermesMessage(e)), 'ok') } as unknown as HermesSessionClient;
    await new HermesAccountAssistant(sessions).ask({ account: account({ tmsOperatorId: 26281 }), question: 'hi', asker: 'Ann', history: [] });
    expect(sent[0].startsWith('[[operator:D-1]] [[kind:chat]] [[seatos:26281]]\n\n')).toBe(true);
  });

  it('sends the brief on the first message and only again when the facts change', async () => {
    const sent: string[] = [];
    const sessions = { configured: true, send: async (e: AgentEnvelope) => (sent.push(formatHermesMessage(e)), 'ok') } as unknown as HermesSessionClient;
    const assistant = new HermesAccountAssistant(sessions);
    const ask = (acc: AccountContext, q: string) => assistant.ask({ account: acc, question: q, asker: 'Ann', history: [] });

    await ask(account(), 'one');
    await ask(account(), 'two');
    await ask(account({ health: 'Healthy' }), 'three');

    expect(sent[0]).toMatch(/^\[\[operator:\S+\]\] \[\[kind:chat\]\]\n\nContext — Acme Bus[\s\S]*\n\nAnn asks: one$/);
    expect(sent[1]).toMatch(/\]\]\n\nAnn asks: two$/);
    expect(sent[2]).toContain('Context — Acme Bus');
  });

  it('does not mark the brief as delivered when Hermes fails', async () => {
    const sent: string[] = [];
    let fail = true;
    const sessions = { configured: true, send: async (e: AgentEnvelope) => { sent.push(formatHermesMessage(e)); if (fail) throw new Error('boom'); return 'ok'; } } as unknown as HermesSessionClient;
    const assistant = new HermesAccountAssistant(sessions);
    await expect(assistant.ask({ account: account(), question: 'a', asker: 'Ann', history: [] })).rejects.toThrow();
    fail = false;
    await assistant.ask({ account: account(), question: 'b', asker: 'Ann', history: [] });
    expect(sent[1]).toContain('Context — Acme Bus');
  });
});
