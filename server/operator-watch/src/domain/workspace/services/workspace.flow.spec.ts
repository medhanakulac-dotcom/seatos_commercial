import { CrmAccount, CrmSnapshotMeta } from '../entities/workspace.entities';
import { TemplateDraftWriter } from '../../../infrastructure/workspace-drafts/template-draft.writer';
import { DisconnectedAccountAssistant, DisconnectedEmailRewriter } from '../../../infrastructure/workspace-mocks/disconnected-ai.adapters';
import { InMemoryWorkspaceStore } from '../../../infrastructure/workspace-mocks/in-memory-workspace.store';
import { MockHubSpotNoteSync } from '../../../infrastructure/workspace-mocks/mock-hubspot.adapters';
import { AgentEvent, AgentNotifier, AgentTrigger, EmailSender, EmailSendError, OutgoingEmail } from '../types/repositories/workspace.ports';
import { currentPeriod, nextSlot } from '../value-objects/schedule';
import { RunService } from './run.service';
import { SendingService } from './sending.service';
import { DEFAULT_SETTINGS, validateSettings, WorkspaceSettings } from './settings';
import { SettingsService } from './workspace.shared';
import { WorkspaceService } from './workspace.service';

const meta: CrmSnapshotMeta = { kind: 'mock', portal: 'Test', pulledAt: '2026-09-29', description: 'test' };
const account = (id: string, segment: CrmAccount['segment'], crmHealth: CrmAccount['crmHealth'], extra: Partial<CrmAccount> = {}): CrmAccount => ({
  id,
  crmId: `hs-${id}`,
  name: `Operator ${id}`,
  segment,
  crmHealth,
  country: 'Thailand',
  owner: 'Anong Srisuk',
  amount: 1000,
  createdAt: '2024-01-01',
  modifiedAt: '2026-09-28',
  lastNoteAt: '2026-09-01',
  deals: [{ id: `deal-${id}`, pipeline: 'Client Pipeline', stage: 'Fully Live', amount: 1000, health: crmHealth, url: null }],
  contacts: [{ id: `c-${id}`, name: 'Ops', email: `ops@${id}.example` }],
  ...extra,
});
const ACCOUNTS = [
  account('rescue', 'High', 'Unhealthy'), // Rescue: outreach, drafted on Generate
  account('auto', 'Low', 'Unhealthy'), // Automated Activation: auto-drafted
  account('healthy', 'Mid', 'Healthy'), // no action
  account('dormant', 'Dormant', 'Unhealthy'), // reactive
  account('nocontact', 'Low', 'Unhealthy', { contacts: [] }),
];
const chris = { id: 'u1', name: 'Chris' };

class FakeSender implements EmailSender {
  readonly sent: OutgoingEmail[] = [];
  fail = 0;
  failWith: Error | null = null;
  constructor(readonly channel: 'smtp' | 'hubspot', readonly configured = true) {}
  async send(email: OutgoingEmail) {
    if (this.failWith) throw this.failWith;
    if (this.fail > 0) {
      this.fail--;
      throw new Error('SMTP 451 try later');
    }
    this.sent.push(email);
    return { providerMessageId: `msg-${this.sent.length}`, response: '250 OK' };
  }
}

function setup(opts: { now?: Date; settings?: Partial<WorkspaceSettings>; accounts?: () => CrmAccount[]; notifier?: AgentNotifier } = {}) {
  let now = opts.now ?? new Date('2026-09-30T03:00:00Z'); // Wed 10:00 Bangkok
  const clock = { now: () => now };
  const store = new InMemoryWorkspaceStore();
  store.settings = { ...DEFAULT_SETTINGS, ...opts.settings, sending: { ...DEFAULT_SETTINGS.sending, ...opts.settings?.sending, smtp: { enabled: true, fromName: 'CS', fromAddress: 'cs@seatos.com' } } };
  const crm = { snapshot: async () => ({ meta, accounts: (opts.accounts ?? (() => ACCOUNTS))() }) };
  const triggered: string[] = [];
  const agent: AgentTrigger = { trigger: async (e) => void triggered.push(e.runId) };
  const writer = new TemplateDraftWriter();
  const settings = new SettingsService(store);
  const runs = new RunService(store, crm, agent, writer, clock, settings);
  const workspace = new WorkspaceService(store, crm, new MockHubSpotNoteSync(), writer, new DisconnectedEmailRewriter(), new DisconnectedAccountAssistant(), clock, runs, settings, undefined, opts.notifier);
  const smtp = new FakeSender('smtp');
  const sending = new SendingService(store, [smtp, new FakeSender('hubspot', false)], clock, settings);
  return { store, runs, workspace, sending, smtp, triggered, setNow: (d: Date) => (now = d), settingsService: settings };
}

const byId = async (w: WorkspaceService) => Object.fromEntries((await w.list()).map((v) => [v.account.id, v]));

describe('schedule', () => {
  const weekly = { cadence: 'weekly' as const, weekday: 1, time: '05:00', timezone: 'Asia/Bangkok' };
  it('opens weekly periods at Monday 05:00 Bangkok', () => {
    expect(currentPeriod(new Date('2026-10-04T21:59:00Z'), weekly).label).toBe('2026-W40'); // Mon 04:59
    const p = currentPeriod(new Date('2026-10-04T22:00:00Z'), weekly); // Mon 05:00
    expect(p).toMatchObject({ label: '2026-W41', key: 'weekly:2026-10-05@05:00' });
    expect(p.opensAt.toISOString()).toBe('2026-10-04T22:00:00.000Z');
  });
  it('opens daily periods at the configured time', () => {
    const daily = { ...weekly, cadence: 'daily' as const, time: '07:30' };
    expect(currentPeriod(new Date('2026-09-30T00:29:00Z'), daily).label).toBe('2026-09-29');
    expect(currentPeriod(new Date('2026-09-30T00:30:00Z'), daily).label).toBe('2026-09-30');
  });
  it('finds the next send slot', () => {
    expect(nextSlot(new Date('2026-09-30T03:00:00Z'), 2, '09:00', 'Asia/Bangkok').toISOString()).toBe('2026-10-06T02:00:00.000Z'); // next Tue
    expect(nextSlot(new Date('2026-09-29T01:00:00Z'), 2, '09:00', 'Asia/Bangkok').toISOString()).toBe('2026-09-29T02:00:00.000Z'); // today, later
  });
});

describe('runs', () => {
  it('bootstraps a local run on first use and applies the playbook', async () => {
    const { workspace, store } = setup();
    await workspace.ready();
    const v = await byId(workspace);
    expect(v.rescue).toMatchObject({ state: 'pending', drafted: false, noSend: false });
    expect(v.auto).toMatchObject({ state: 'pending', drafted: true });
    expect(v.healthy).toMatchObject({ state: 'healthy', noSend: true });
    expect(v.dormant).toMatchObject({ state: 'reactive', noSend: true });
    expect(v.rescue.case?.caseRef).toMatch(/^M\d{12}-\d{4}$/);
    expect(store.runs[0]).toMatchObject({ status: 'completed', agent: 'local', trigger: 'manual' });
  });

  it('hands hermes runs to the agent and accepts idempotent submissions', async () => {
    const { runs, triggered, store } = setup({ settings: { agent: { mode: 'hermes', webhookUrl: 'http://hermes/webhooks/ow', playbookVersion: 'pb-7' } } });
    const run = (await runs.startRun('manual', 'admin'))!;
    expect(triggered).toEqual([run.id]);
    expect(run).toMatchObject({ status: 'running', agent: 'hermes', playbookVersion: 'pb-7' });

    const draft = { subject: 'Hello', body: 'Body v1' };
    const first = await runs.submitCase(run.id, { operatorId: 'rescue', needsOutreach: true, analysis: 'Bookings down', playbook: 'Rescue', draft }, 'agent:hermes');
    const again = await runs.submitCase(run.id, { operatorId: 'rescue', needsOutreach: true, analysis: 'Bookings down more', draft: { ...draft, body: 'Body v2' } }, 'agent:hermes');
    expect(again.caseRef).toBe(first.caseRef);
    expect(again.draftVersion).toBe(2);
    expect([...store.cases.values()]).toHaveLength(1);
    expect([...store.drafts.values()].map((d) => d.writer)).toEqual(['agent', 'agent']);
  });

  it('guards block outreach to Dormant and Healthy accounts whatever the agent says', async () => {
    const { runs } = setup({ settings: { agent: { mode: 'hermes', webhookUrl: 'http://h/x', playbookVersion: '' } } });
    const run = (await runs.startRun('manual', 'admin'))!;
    const d = await runs.submitCase(run.id, { operatorId: 'dormant', needsOutreach: true, analysis: 'x', draft: { subject: 's', body: 'b' } }, 'agent:hermes');
    const h = await runs.submitCase(run.id, { operatorId: 'healthy', needsOutreach: true, analysis: 'x' }, 'agent:hermes');
    expect(d).toMatchObject({ outcome: 'no_action', state: 'reactive', draftVersion: null, guard: expect.stringContaining('Dormant') });
    expect(h).toMatchObject({ outcome: 'no_action', guard: expect.stringContaining('Healthy') });
  });

  it('never lets the agent overwrite a case a person has decided on', async () => {
    const { runs, workspace } = setup({ settings: { agent: { mode: 'hermes', webhookUrl: 'http://h/x', playbookVersion: '' } } });
    const run = (await runs.startRun('manual', 'admin'))!;
    await runs.submitCase(run.id, { operatorId: 'auto', needsOutreach: true, analysis: 'x', draft: { subject: 's', body: 'b' } }, 'agent:hermes');
    await workspace.decide('auto', 'hold', chris);
    await expect(runs.submitCase(run.id, { operatorId: 'auto', needsOutreach: true, analysis: 'y' }, 'agent:hermes')).rejects.toThrow('already hold');
    await runs.completeRun(run.id, 'done');
    await expect(runs.submitCase(run.id, { operatorId: 'rescue', needsOutreach: false, analysis: 'late' }, 'agent:hermes')).rejects.toThrow('completed');
  });

  it('expires unfinished cases when the next run opens, keeping approved ones', async () => {
    const { workspace, runs, setNow } = setup();
    await workspace.ready();
    await workspace.decide('auto', 'approve', chris);
    setNow(new Date('2026-10-01T03:00:00Z'));
    await runs.startRun('manual', 'admin');
    const detail = await workspace.get('rescue');
    expect(detail.history.map((c) => c.state)).toEqual(['pending', 'expired']);
    expect((await workspace.get('auto')).history[1].state).toBe('approved');
    const leader = await workspace.leader();
    expect(leader.lastWeek.rows).toEqual([{ owner: 'Anong Srisuk', total: 3, expired: 2 }]);
  });

  it('schedules exactly one run per period, only when enabled', async () => {
    const settings = { pipeline: { ...DEFAULT_SETTINGS.pipeline, enabled: true, cadence: 'daily' as const, time: '09:00' } };
    const { runs, setNow, store } = setup({ now: new Date('2026-09-30T02:30:00Z'), settings }); // 09:30 BKK
    expect(await runs.tick()).toMatchObject({ label: '2026-09-30', trigger: 'schedule' });
    expect(await runs.tick()).toBeNull();
    setNow(new Date('2026-09-30T20:00:00Z')); // 03:00 next day BKK, before today's slot, 18h after the last slot
    expect(await runs.tick()).toBeNull();
    expect(store.runs).toHaveLength(1);
    const off = setup({ settings: { pipeline: { ...settings.pipeline, enabled: false } } });
    expect(await off.runs.tick()).toBeNull();
  });
});

describe('approval and sending', () => {
  it('approves to a channel and recipient, and queues the exact draft for the next slot', async () => {
    const { workspace, store } = setup();
    await workspace.ready();
    await expect(workspace.decide('rescue', 'approve', chris)).rejects.toThrow('Generate a draft');
    await expect(workspace.decide('auto', 'approve', chris, { channel: 'hubspot' })).rejects.toThrow('not enabled');
    await expect(workspace.decide('nocontact', 'approve', chris)).rejects.toThrow('recipient');
    await workspace.decide('auto', 'approve', chris, { channel: 'smtp' });
    const [job] = [...store.jobs.values()];
    const draft = store.drafts.get((await workspace.get('auto')).case!.currentDraftId!)!;
    expect(job).toMatchObject({ channel: 'smtp', recipient: 'ops@auto.example', status: 'queued', subject: draft.subject, body: draft.body, draftHash: draft.draftHash, scheduledFor: '2026-10-06T02:00:00.000Z' });
    expect(store.decisions.at(-1)).toMatchObject({ decision: 'approve', channel: 'smtp', recipient: 'ops@auto.example', actorName: 'Chris' });
  });

  it('voids the approval and cancels the queued email when the draft changes', async () => {
    const { workspace, store } = setup();
    await workspace.ready();
    await workspace.decide('auto', 'approve', chris);
    await workspace.rewrite('auto', 'shorter', chris);
    const v = await workspace.get('auto');
    expect(v.state).toBe('pending');
    expect(v.case!.voidNote).toMatch(/needs approval again/);
    expect([...store.jobs.values()][0].status).toBe('cancelled');
  });

  it('keeps agent drafts out of template rewrites but allows editing on approval', async () => {
    const { runs, workspace, store } = setup({ settings: { agent: { mode: 'hermes', webhookUrl: 'http://h/x', playbookVersion: '' } } });
    const run = (await runs.startRun('manual', 'admin'))!;
    await runs.submitCase(run.id, { operatorId: 'rescue', needsOutreach: true, analysis: 'x', draft: { subject: 'From Hermes', body: 'Hermes body' } }, 'agent:hermes');
    await expect(workspace.rewrite('rescue', 'warmer', chris)).rejects.toThrow('edit it directly');
    await workspace.decide('rescue', 'approve', chris, { editedBody: 'Edited by Chris', recipient: 'owner@rescue.example' });
    const job = [...store.jobs.values()][0];
    expect(job).toMatchObject({ body: 'Edited by Chris', subject: 'From Hermes', recipient: 'owner@rescue.example' });
  });

  it('sends nothing while sending is disabled, then delivers exactly the approved text', async () => {
    const { workspace, sending, smtp, store, settingsService, setNow } = setup({ settings: { sending: { ...DEFAULT_SETTINGS.sending, schedule: { mode: 'immediate', weekday: 2, time: '09:00' } } } });
    await workspace.ready();
    await workspace.decide('auto', 'approve', chris);
    expect(await sending.processDue()).toBe(0);
    const s = await settingsService.get();
    await settingsService.save({ ...s, sending: { ...s.sending, enabled: true, redirectAllTo: 'qa@seatos.com' } }, 'admin');
    setNow(new Date('2026-09-30T03:01:00Z'));
    expect(await sending.processDue()).toBe(1);
    const job = [...store.jobs.values()][0];
    expect(smtp.sent[0]).toMatchObject({ to: 'qa@seatos.com', originalRecipient: 'ops@auto.example', subject: job.subject, body: job.body });
    expect(job).toMatchObject({ status: 'sent', deliveredTo: 'qa@seatos.com', providerMessageId: 'msg-1', providerResponse: '250 OK', claimedAt: '2026-09-30T03:01:00.000Z' });
    await expect(workspace.rewrite('auto', 'warmer', chris)).rejects.toThrow('already been sent');
    expect((await workspace.get('auto')).events.at(-1)!.text).toBe('Test mode: delivered to qa@seatos.com instead of ops@auto.example — the client was not emailed');
  });

  it('never emails a real recipient outside production without an explicit override', async () => {
    const { workspace, sending, smtp, store, setNow } = setup({ settings: { sending: { ...DEFAULT_SETTINGS.sending, enabled: true, schedule: { mode: 'immediate', weekday: 2, time: '09:00' } } } });
    await workspace.ready();
    await workspace.decide('auto', 'approve', chris);
    setNow(new Date('2026-09-30T03:01:00Z'));
    await sending.processDue();
    expect(smtp.sent).toHaveLength(0);
    expect([...store.jobs.values()][0]).toMatchObject({ status: 'queued', error: expect.stringContaining('Real recipients are blocked outside production') });
  });

  it('retries failed sends with backoff', async () => {
    const { workspace, sending, smtp, store, setNow } = setup({ settings: { sending: { ...DEFAULT_SETTINGS.sending, enabled: true, redirectAllTo: 'qa@seatos.com', schedule: { mode: 'immediate', weekday: 2, time: '09:00' } } } });
    await workspace.ready();
    await workspace.decide('auto', 'approve', chris);
    smtp.fail = 1;
    setNow(new Date('2026-09-30T03:01:00Z'));
    await sending.processDue();
    const job = [...store.jobs.values()][0];
    expect(job).toMatchObject({ status: 'queued', attempts: 1, error: 'SMTP 451 try later' });
    setNow(new Date('2026-09-30T03:05:00Z'));
    await sending.processDue();
    expect([...store.jobs.values()][0].status).toBe('sent');
    expect(smtp.sent).toHaveLength(1);
  });

  const due = { sending: { ...DEFAULT_SETTINGS.sending, enabled: true, redirectAllTo: 'qa@seatos.com', schedule: { mode: 'immediate' as const, weekday: 2, time: '09:00' } } };

  it('passes the admin Reply-To to the sender and keeps the shared From out of it', async () => {
    const { workspace, sending, smtp, setNow } = setup({ settings: { sending: { ...due.sending, replyTo: 'cs-team@seatos.com' } } });
    await workspace.ready();
    await workspace.decide('auto', 'approve', chris);
    setNow(new Date('2026-09-30T03:01:00Z'));
    await sending.processDue();
    expect(smtp.sent[0]).toMatchObject({ replyTo: 'cs-team@seatos.com' });
  });

  it('fails a permanently rejected email at once instead of retrying', async () => {
    const { workspace, sending, smtp, store, setNow } = setup({ settings: due });
    await workspace.ready();
    await workspace.decide('auto', 'approve', chris);
    smtp.failWith = new EmailSendError('550 5.1.1 No such user', true, 550);
    setNow(new Date('2026-09-30T03:01:00Z'));
    await sending.processDue();
    expect([...store.jobs.values()][0]).toMatchObject({ status: 'failed', attempts: 1, error: '550 5.1.1 No such user' });
    expect((await workspace.get('auto')).events.at(-1)).toMatchObject({ kind: 'bad', text: 'Email could not be sent via Email server (SMTP): 550 5.1.1 No such user' });
    setNow(new Date('2026-09-30T04:00:00Z'));
    expect(await sending.processDue()).toBe(0);
  });

  it('keeps retrying a transient failure until the attempts run out, then fails it', async () => {
    const { workspace, sending, smtp, store, setNow } = setup({ settings: due });
    await workspace.ready();
    await workspace.decide('auto', 'approve', chris);
    smtp.failWith = new EmailSendError('451 try later', false, 451);
    let at = new Date('2026-09-30T03:01:00Z').getTime();
    for (let i = 0; i < 5; i++) {
      setNow(new Date(at));
      await sending.processDue();
      at += 60 * 60_000;
    }
    expect([...store.jobs.values()][0]).toMatchObject({ status: 'failed', attempts: 5 });
    expect(smtp.sent).toHaveLength(0);
  });

  it('never resends a job whose worker died mid-send: it is failed as delivery-uncertain', async () => {
    const { workspace, sending, smtp, store, setNow } = setup({ settings: due });
    await workspace.ready();
    await workspace.decide('auto', 'approve', chris);
    const job = [...store.jobs.values()][0];
    job.status = 'sending';
    job.attempts = 1;
    job.claimedAt = '2026-09-30T03:00:00.000Z';
    setNow(new Date('2026-09-30T03:05:00Z')); // inside the lease: left alone
    await sending.processDue();
    expect(job.status).toBe('sending');
    setNow(new Date('2026-09-30T03:11:00Z'));
    await sending.processDue();
    expect(job).toMatchObject({ status: 'failed', error: expect.stringContaining('Delivery uncertain') });
    expect(smtp.sent).toHaveLength(0);
    expect((await workspace.get('auto')).events.at(-1)).toMatchObject({ kind: 'bad', text: expect.stringContaining('may or may not have been sent') });
  });

  it('caps how many emails go out per minute', async () => {
    process.env.SEND_MAX_PER_MINUTE = '1';
    try {
      const two = () => [account('auto', 'Low', 'Unhealthy'), account('auto2', 'Low', 'Unhealthy')];
      const { workspace, sending, smtp, setNow } = setup({ settings: due, accounts: two });
      await workspace.ready();
      await workspace.decide('auto', 'approve', chris);
      await workspace.decide('auto2', 'approve', chris);
      setNow(new Date('2026-09-30T03:01:00Z'));
      expect(await sending.processDue()).toBe(1);
      setNow(new Date('2026-09-30T03:01:30Z'));
      expect(await sending.processDue()).toBe(0);
      setNow(new Date('2026-09-30T03:02:05Z'));
      expect(await sending.processDue()).toBe(1);
      expect(smtp.sent).toHaveLength(2);
    } finally {
      delete process.env.SEND_MAX_PER_MINUTE;
    }
  });

  it('refuses to boot in production with sending on for an unconfigured channel', async () => {
    const env = process.env.NODE_ENV;
    const { sending, settingsService } = setup({ settings: { sending: { ...DEFAULT_SETTINGS.sending, enabled: true, hubspot: { enabled: true, emailId: '1' } } } });
    await settingsService.get();
    try {
      process.env.NODE_ENV = 'production';
      await expect(sending.onApplicationBootstrap()).rejects.toThrow('HubSpot');
      process.env.NODE_ENV = 'test';
      await expect(sending.onApplicationBootstrap()).resolves.toBeUndefined();
    } finally {
      process.env.NODE_ENV = env;
    }
  });
});

describe('settings validation', () => {
  it('rejects unsafe or incomplete configurations', () => {
    expect(() => validateSettings({ ...DEFAULT_SETTINGS, agent: { mode: 'hermes', webhookUrl: '', playbookVersion: '' } })).toThrow('webhookUrl');
    expect(() => validateSettings({ ...DEFAULT_SETTINGS, pipeline: { ...DEFAULT_SETTINGS.pipeline, time: '25:00' } })).toThrow('HH:mm');
    expect(() => validateSettings({ ...DEFAULT_SETTINGS, pipeline: { ...DEFAULT_SETTINGS.pipeline, timezone: 'Mars/Base' } })).toThrow('timezone');
    expect(() => validateSettings({ ...DEFAULT_SETTINGS, sending: { ...DEFAULT_SETTINGS.sending, redirectAllTo: 'not-an-email' } })).toThrow('email');
    expect(() => validateSettings({ ...DEFAULT_SETTINGS, sending: { ...DEFAULT_SETTINGS.sending, defaultChannel: 'hubspot' } })).toThrow('enabled channel');
    expect(() => validateSettings({ ...DEFAULT_SETTINGS, sending: { ...DEFAULT_SETTINGS.sending, enabled: true } })).toThrow('fromAddress');
    expect(() => validateSettings({ ...DEFAULT_SETTINGS, sending: { ...DEFAULT_SETTINGS.sending, replyTo: 'nope' } })).toThrow('replyTo');
    // A server-side default From (SMTP_FROM_ADDRESS) makes the settings one optional.
    expect(validateSettings({ ...DEFAULT_SETTINGS, sending: { ...DEFAULT_SETTINGS.sending, enabled: true } }, { smtpFromFallback: true }).sending.enabled).toBe(true);
    expect(validateSettings(DEFAULT_SETTINGS)).toEqual(DEFAULT_SETTINGS);
  });
});

describe('agent notifications', () => {
  const recorder = (fail = false) => {
    const events: AgentEvent[] = [];
    const notifier: AgentNotifier = { notify: async (e) => (events.push(e), fail ? Promise.reject(new Error('agent down')) : undefined) };
    return { events, notifier };
  };

  it('tells the agent about reject, hold and close with their reasons, and persists hold/close reasons', async () => {
    const { events, notifier } = recorder();
    const { workspace, store } = setup({ notifier });
    await workspace.ready();
    await workspace.decide('auto', 'reject', chris, { reason: 'wrong tone' });
    await workspace.decide('auto', 'hold', chris, { reason: 'wait for QBR' });
    await workspace.decide('auto', 'close', chris, { reason: 'churned' });
    expect(events).toMatchObject([
      { type: 'decision', operatorId: 'auto', decision: 'reject', actor: 'Chris', reason: 'wrong tone' },
      { type: 'decision', decision: 'hold', reason: 'wait for QBR' },
      { type: 'decision', decision: 'close', reason: 'churned' },
    ]);
    expect(events[0]).toHaveProperty('caseRef');
    expect(store.decisions.map((d) => [d.decision, d.reason])).toEqual([['reject', 'wrong tone'], ['hold', 'wait for QBR'], ['close', 'churned']]);
  });

  it('includes the agent draft and the human edit on approve, and nothing for a failed decision', async () => {
    const { events, notifier } = recorder();
    const { runs, workspace } = setup({ notifier, settings: { agent: { mode: 'hermes', webhookUrl: 'http://h/x', playbookVersion: '' } } });
    const run = (await runs.startRun('manual', 'admin'))!;
    await runs.submitCase(run.id, { operatorId: 'rescue', needsOutreach: true, analysis: 'x', draft: { subject: 'S', body: 'Hermes body' } }, 'agent:hermes');
    await expect(workspace.decide('rescue', 'reopen', chris)).rejects.toThrow();
    expect(events).toEqual([]);
    await workspace.decide('rescue', 'approve', chris, { editedBody: 'Edited by Chris', recipient: 'owner@rescue.example' });
    expect(events[0]).toMatchObject({ decision: 'approve', edit: { agentBody: 'Hermes body', finalBody: 'Edited by Chris' } });
  });

  it('never blocks or fails a decision when the notifier rejects', async () => {
    const { events, notifier } = recorder(true);
    const { workspace } = setup({ notifier });
    await workspace.ready();
    await expect(workspace.decide('auto', 'hold', chris)).resolves.toBeUndefined();
    expect(events).toHaveLength(1);
    const never: AgentNotifier = { notify: () => new Promise(() => undefined) };
    const hung = setup({ notifier: never });
    await hung.workspace.ready();
    await expect(hung.workspace.decide('auto', 'hold', chris)).resolves.toBeUndefined();
  });
});

describe('shared operator chat', () => {
  it('keeps every colleague\'s question and the agent\'s answers in one thread, and tells the agent who is asking', async () => {
    const { store, runs, workspace } = setup();
    await workspace.ready();
    const heard: string[] = [];
    const assistant = { connected: true, author: { id: 'agent:hermes', name: 'Hermes' }, sessionId: (id: string) => `opw-${id}`, ask: async (i: { asker: string; question: string }) => (heard.push(`${i.asker}: ${i.question}`), `answer to ${i.question}`) };
    const clock = { now: () => new Date('2026-09-30T03:00:00Z') };
    const settings = new SettingsService(store);
    const chat = new WorkspaceService(store, { snapshot: async () => ({ meta, accounts: ACCOUNTS }) }, new MockHubSpotNoteSync(), new TemplateDraftWriter(), new DisconnectedEmailRewriter(), assistant, clock, runs, settings);
    const id = ACCOUNTS[0].id;

    await chat.ask(id, 'why unhealthy?', { id: 'u1', name: 'Ann' });
    await chat.ask(id, 'and the owner?', { id: 'u2', name: 'Bo' });

    const thread = await chat.conversation(id);
    expect(thread.sessionId).toBe(`opw-${id}`);
    expect(thread.messages.map((m) => `${m.authorName}/${m.role}: ${m.text}`)).toEqual([
      'Ann/user: why unhealthy?',
      'Hermes/assistant: answer to why unhealthy?',
      'Bo/user: and the owner?',
      'Hermes/assistant: answer to and the owner?',
    ]);
    expect(heard).toEqual(['Ann: why unhealthy?', 'Bo: and the owner?']);
    expect((await workspace.conversation(ACCOUNTS[1].id)).messages).toEqual([]);
  });
});
