import { Pool } from 'pg';
import { migrate } from './migrator';
import { MAX_ATTEMPTS, PgAgentStore } from './pg-agent.store';

/**
 * Runs against a real Postgres when TEST_DATABASE_URL is set (see pg-workspace.store.spec.ts). Only the agent tables
 * (and the runs it creates) are touched.
 */
const url = process.env.TEST_DATABASE_URL;
const describeDb = url ? describe : describe.skip;

describeDb('PgAgentStore', () => {
  let pool: Pool;
  let store: PgAgentStore;
  const runId = '00000000-0000-4000-8000-0000000000a1';

  beforeAll(async () => {
    pool = new Pool({ connectionString: url });
    await migrate(pool);
    store = new PgAgentStore(pool);
    await pool.query('delete from agent_memories');
    await pool.query('delete from workflow_runs where id = $1', [runId]);
    await pool.query('insert into crm_snapshots (id, source, portal, description, pulled_at, content_hash, account_count, accounts) values ($1, $2, $3, $4, now(), $5, 0, $6) on conflict do nothing', [
      '00000000-0000-4000-8000-0000000000b1', 'mock', 'test', 'test', 'h', '[]',
    ]);
    await pool.query(
      `insert into workflow_runs (id, period_key, label, trigger, status, agent, snapshot_id, triggered_by, started_at)
       values ($1, 'manual:agent-test', 'agent test', 'manual', 'running', 'claude', '00000000-0000-4000-8000-0000000000b1', 'test', now())`,
      [runId],
    );
  });

  afterAll(async () => {
    await pool.query('delete from workflow_runs where id = $1', [runId]);
    await pool?.end();
  });

  it('queues one job per operator, leases them, and never hands the same job to two claims', async () => {
    await store.enqueue(runId, [{ id: 'A', name: 'Alpha', tmsOperatorId: 7 }, { id: 'B', name: 'Bravo' }, { id: 'C', name: 'Charlie' }]);
    await store.enqueue(runId, [{ id: 'A', name: 'Alpha' }]); // idempotent
    const now = new Date().toISOString();
    const later = new Date(Date.now() + 60_000).toISOString();
    const [first, second] = await Promise.all([store.claim(2, now, later, MAX_ATTEMPTS), store.claim(2, now, later, MAX_ATTEMPTS)]);
    const ids = [...first, ...second].map((j) => j.operatorId).sort();
    expect(ids).toEqual(['A', 'B', 'C']);
    expect([...first, ...second].find((j) => j.operatorId === 'A')).toMatchObject({ tmsOperatorId: 7, status: 'working', attempts: 1 });
    expect(await store.progress(runId)).toEqual({ pending: 0, working: 3, done: 0, failed: 0 });
  });

  it('finishes, retries, and fails jobs; picks up a lapsed lease; fails one that ran out of attempts', async () => {
    const jobs = Object.fromEntries((await pool.query('select id, operator_id from agent_jobs where run_id = $1', [runId])).rows.map((r) => [r.operator_id, r.id]));
    await store.finish(jobs.A, { ok: true });
    await store.finish(jobs.B, { ok: false, error: 'overloaded', retry: true });
    expect(await store.progress(runId)).toEqual({ pending: 1, working: 1, done: 1, failed: 0 });

    // C's lease lapsed (function stopped): the next claim takes it again, along with the retried B.
    const future = new Date(Date.now() + 120_000).toISOString();
    const retaken = await store.claim(5, future, new Date(Date.now() + 180_000).toISOString(), MAX_ATTEMPTS);
    expect(retaken.map((j) => [j.operatorId, j.attempts]).sort()).toEqual([['B', 2], ['C', 2]]);

    await pool.query('update agent_jobs set attempts = $2 where id = $1', [jobs.C, MAX_ATTEMPTS]);
    await store.claim(5, new Date(Date.now() + 600_000).toISOString(), new Date(Date.now() + 660_000).toISOString(), MAX_ATTEMPTS);
    const c = (await pool.query('select status, error from agent_jobs where id = $1', [jobs.C])).rows[0];
    expect(c).toEqual({ status: 'failed', error: 'Stopped before it finished' });

    await store.finish(jobs.B, { ok: false, error: 'bad data', retry: false });
    expect(await store.progress(runId)).toEqual({ pending: 0, working: 0, done: 1, failed: 2 });
    expect(await store.recentRuns(new Date(Date.now() - 60_000).toISOString())).toContain(runId);
  });

  it('remembers facts per operator and team-wide, supersedes old ones, and searches team lessons', async () => {
    const [old] = await store.remember([{ operatorId: 'A', kind: 'chat', text: 'Alpha wants a call on Fridays', topics: ['relationship'], source: null }], []);
    await store.remember(
      [
        { operatorId: 'A', kind: 'decision', text: 'Alpha now prefers calls on Mondays', topics: ['relationship'], source: 'C-1' },
        { operatorId: null, kind: 'decision', text: 'The team rejects discount offers in rescue emails', topics: ['pricing', 'outreach'], source: 'C-1' },
      ],
      [old.id],
    );
    await store.remember([{ operatorId: null, kind: 'chat', text: 'Thai operators prefer LINE over email', topics: ['relationship'], source: null }], []);

    expect((await store.forOperator('A', 10)).map((f) => f.text)).toEqual(['Alpha now prefers calls on Mondays']);
    expect((await store.forOperator('B', 10))).toEqual([]);
    expect((await store.team('discount offers', 1)).map((f) => f.text)).toEqual(['The team rejects discount offers in rescue emails']);
    expect((await store.team('', 5)).map((f) => f.text)).toEqual(['Thai operators prefer LINE over email', 'The team rejects discount offers in rescue emails']);
    expect((await store.team('', 5))[1]).toMatchObject({ operatorId: null, topics: ['pricing', 'outreach'], source: 'C-1' });
  });
});
