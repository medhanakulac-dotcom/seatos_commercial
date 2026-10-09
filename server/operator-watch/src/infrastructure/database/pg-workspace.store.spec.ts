import { Pool } from 'pg';
import { CrmAccount } from '../../domain/workspace/entities/workspace.entities';
import { RunService } from '../../domain/workspace/services/run.service';
import { SendingService } from '../../domain/workspace/services/sending.service';
import { DEFAULT_SETTINGS } from '../../domain/workspace/services/settings';
import { SettingsService } from '../../domain/workspace/services/workspace.shared';
import { WorkspaceService } from '../../domain/workspace/services/workspace.service';
import { TemplateDraftWriter } from '../workspace-drafts/template-draft.writer';
import { DisconnectedAccountAssistant, DisconnectedEmailRewriter } from '../workspace-mocks/disconnected-ai.adapters';
import { MockHubSpotNoteSync } from '../workspace-mocks/mock-hubspot.adapters';
import { migrate } from './migrator';
import { PgWorkspaceStore } from './pg-workspace.store';

/**
 * Runs against a real Postgres when TEST_DATABASE_URL is set (e.g. the compose `db` service:
 * postgres://commercial:commercial-local@localhost:5433/commercial_test). The schema is dropped first.
 */
const url = process.env.TEST_DATABASE_URL;
const describeDb = url ? describe : describe.skip;

const account = (id: string, segment: CrmAccount['segment'], crmHealth: CrmAccount['crmHealth']): CrmAccount => ({
  id,
  crmId: id,
  name: `Operator ${id}`,
  segment,
  crmHealth,
  country: 'Thailand',
  owner: 'Anong Srisuk',
  amount: 1,
  createdAt: '2024-01-01',
  modifiedAt: '2026-09-28',
  lastNoteAt: '2026-09-01',
  deals: [{ id: `deal-${id}`, pipeline: 'Client Pipeline', stage: 'Fully Live', amount: 1, health: crmHealth, url: null }],
  contacts: [{ id: `c-${id}`, name: 'Ops', email: `ops@${id}.example` }],
});

describeDb('PgWorkspaceStore (Postgres)', () => {
  let pool: Pool;
  let now = new Date('2026-09-30T03:00:00Z');
  const clock = { now: () => now };

  beforeAll(async () => {
    pool = new Pool({ connectionString: url });
    await pool.query('drop schema public cascade; create schema public;');
    expect(await migrate(pool)).toEqual(expect.arrayContaining(['001_workspace.sql', '004_send_job_delivery.sql']));
    expect(await migrate(pool)).toEqual([]); // idempotent
  });
  afterAll(() => pool?.end());

  function services() {
    const store = new PgWorkspaceStore(pool);
    const settings = new SettingsService(store);
    const crm = { snapshot: async () => ({ meta: { kind: 'mock' as const, portal: 'T', pulledAt: '2026-09-29', description: 'd' }, accounts: [account('a', 'Low', 'Unhealthy'), account('b', 'High', 'Unhealthy'), account('c', 'Mid', 'Healthy')] }) };
    const writer = new TemplateDraftWriter();
    const runs = new RunService(store, crm, { trigger: async () => undefined }, writer, clock, settings);
    const workspace = new WorkspaceService(store, crm, new MockHubSpotNoteSync(), writer, new DisconnectedEmailRewriter(), new DisconnectedAccountAssistant(), clock, runs, settings);
    const sent: string[] = [];
    const sending = new SendingService(store, [{ channel: 'smtp', configured: true, send: async (e) => (sent.push(e.to), { providerMessageId: 'm', response: '250 OK' }) }], clock, settings);
    return { store, settings, runs, workspace, sending, sent };
  }

  it('runs the full flow on Postgres: run, cases, approval, send', async () => {
    const { store, settings, workspace, sending, sent } = services();
    await settings.save({ ...DEFAULT_SETTINGS, sending: { ...DEFAULT_SETTINGS.sending, enabled: true, redirectAllTo: 'qa@seatos.test', smtp: { enabled: true, fromName: 'CS', fromAddress: 'cs@seatos.com' }, schedule: { mode: 'immediate', weekday: 2, time: '09:00' } } }, 'test');
    await workspace.ready();
    const views = Object.fromEntries((await workspace.list()).map((v) => [v.account.id, v]));
    expect(views.a).toMatchObject({ state: 'pending', drafted: false }); // drafts come from Generate
    expect(views.c).toMatchObject({ state: 'healthy' });
    await workspace.generateDraft('a', { id: 'u1', name: 'Chris' });
    expect(await workspace.get('a')).toMatchObject({ draft: { writer: 'template', version: 1 } });

    await workspace.decide('a', 'approve', { id: 'u1', name: 'Chris' });
    now = new Date('2026-09-30T03:01:00Z');
    expect(await sending.processDue()).toBe(1);
    expect(sent).toEqual(['qa@seatos.test']);
    const detail = await workspace.get('a');
    expect(detail.sendJobs[0]).toMatchObject({ status: 'sent', attempts: 1, providerMessageId: 'm', providerResponse: '250 OK', claimedAt: '2026-09-30T03:01:00.000Z' });
    expect(detail.events.at(-1)!.text).toContain('the client was not emailed');
    expect(await store.countSent()).toBe(1);
  });

  it('refuses a second scheduled run for the same period', async () => {
    // Two service instances = two backend replicas; only the database constraint can dedupe them.
    const one = services();
    const two = services();
    const s = await one.settings.get();
    await one.settings.save({ ...s, pipeline: { ...s.pipeline, enabled: true, cadence: 'daily', time: '09:00' } }, 'test');
    now = new Date('2026-10-01T02:30:00Z'); // 09:30 Bangkok
    const results = await Promise.all([one.runs.tick(), two.runs.tick()]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await one.runs.tick()).toBeNull();
    // The new run expired run 1's open case for operator b.
    const { store } = services();
    const b = await store.casesForOperator('b');
    expect(b.map((c) => c.state)).toEqual(['pending', 'expired']);
  });

  it('rolls back a transaction on error', async () => {
    const { store } = services();
    const before = (await store.listRuns(100)).length;
    await expect(
      store.transaction(async (tx) => {
        await tx.saveSettings({ ...DEFAULT_SETTINGS, guards: { blockDormant: false, blockHealthy: false } }, 'tx');
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect((await store.getSettings())?.guards?.blockDormant).toBe(true);
    expect((await store.listRuns(100)).length).toBe(before);
  });

  it('lets only one worker claim a due send job', async () => {
    const { store, workspace, settings } = services();
    const s = await settings.get();
    await settings.save({ ...s, pipeline: { ...s.pipeline, enabled: false } }, 'test');
    await workspace.decide('b', 'approve', { id: 'u1', name: 'Chris' }).catch(() => undefined); // b has no draft: generate first
    await workspace.generateDraft('b', { id: 'u1', name: 'Chris' });
    await workspace.decide('b', 'approve', { id: 'u1', name: 'Chris' });
    now = new Date('2026-11-30T00:00:00Z');
    const [x, y] = await Promise.all([store.claimDueJobs(now.toISOString(), 10), store.claimDueJobs(now.toISOString(), 10)]);
    expect(x.length + y.length).toBe(1);
    expect([...x, ...y][0]).toMatchObject({ status: 'sending', claimedAt: now.toISOString() });
    // A claim still inside the lease is left alone; an older one is failed (never re-queued) as delivery-uncertain.
    expect(await store.failStaleJobs(new Date(now.getTime() - 60_000).toISOString(), 'x')).toEqual([]);
    const stale = await store.failStaleJobs(new Date(now.getTime() + 60_000).toISOString(), 'Delivery uncertain');
    expect(stale).toHaveLength(1);
    expect(stale[0]).toMatchObject({ status: 'failed', error: 'Delivery uncertain' });
    expect(await store.claimDueJobs(now.toISOString(), 10)).toEqual([]);
  });
});
