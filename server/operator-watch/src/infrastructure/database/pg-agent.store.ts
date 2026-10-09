import { Pool, QueryResultRow } from 'pg';
import { newId } from '../../domain/workspace/services/workspace.shared';
import { AgentJob, AgentJobQueue, AgentMemoryStore, MemoryFact, NewMemoryFact } from '../../domain/workspace/types/repositories/workspace.ports';

const toFact = (r: QueryResultRow): MemoryFact => ({
  id: r.id,
  operatorId: r.operator_id,
  kind: r.kind,
  text: r.text,
  topics: r.topics ?? [],
  source: r.source,
  createdAt: new Date(r.created_at).toISOString(),
});

const toJob = (r: QueryResultRow): AgentJob => ({
  id: r.id,
  runId: r.run_id,
  operatorId: r.operator_id,
  operatorName: r.operator_name,
  tmsOperatorId: r.tms_operator_id,
  status: r.status,
  attempts: r.attempts,
  error: r.error,
});

/** Agent memory and the assessment queue in Postgres (tables from migrations/006_claude_agent.sql). */
export class PgAgentStore implements AgentMemoryStore, AgentJobQueue {
  constructor(private readonly pool: Pool) {}

  // ── memory ────────────────────────────────────────────────────────────────

  async forOperator(operatorId: string, limit: number): Promise<MemoryFact[]> {
    const { rows } = await this.pool.query(
      'select * from agent_memories where operator_id = $1 and superseded_by is null order by created_at desc limit $2',
      [operatorId, limit],
    );
    return rows.map(toFact);
  }

  async team(query: string, limit: number): Promise<MemoryFact[]> {
    const { rows } = query.trim()
      ? await this.pool.query(
          `select *, ts_rank(search, plainto_tsquery('simple', $1)) as rank from agent_memories
           where operator_id is null and superseded_by is null
           order by rank desc, created_at desc limit $2`,
          [query.slice(0, 500), limit],
        )
      : await this.pool.query('select * from agent_memories where operator_id is null and superseded_by is null order by created_at desc limit $1', [limit]);
    return rows.map(toFact);
  }

  async remember(facts: readonly NewMemoryFact[], supersedes: readonly string[]): Promise<MemoryFact[]> {
    if (!facts.length && !supersedes.length) return [];
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const added: MemoryFact[] = [];
      for (const f of facts) {
        const { rows } = await client.query(
          'insert into agent_memories (id, operator_id, kind, text, topics, source) values ($1, $2, $3, $4, $5, $6) returning *',
          [newId(), f.operatorId, f.kind, f.text, f.topics, f.source],
        );
        added.push(toFact(rows[0]));
      }
      // Retired facts point at the first new fact; with no new fact they are simply retired (pointing at themselves).
      if (supersedes.length) {
        await client.query('update agent_memories set superseded_by = coalesce($2, id) where id = any($1::uuid[]) and superseded_by is null', [
          supersedes,
          added[0]?.id ?? null,
        ]);
      }
      await client.query('commit');
      return added;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  // ── jobs ──────────────────────────────────────────────────────────────────

  async enqueue(runId: string, operators: readonly { id: string; name: string; tmsOperatorId?: number }[]): Promise<void> {
    for (const op of operators) {
      await this.pool.query(
        'insert into agent_jobs (id, run_id, operator_id, operator_name, tms_operator_id) values ($1, $2, $3, $4, $5) on conflict (run_id, operator_id) do nothing',
        [newId(), runId, op.id, op.name, op.tmsOperatorId ?? null],
      );
    }
  }

  async claim(limit: number, now: string, leaseUntil: string, maxAttempts: number): Promise<AgentJob[]> {
    // A job that ran out of attempts and whose last lease lapsed (the function was stopped mid-way) is failed for good.
    await this.pool.query(
      `update agent_jobs set status = 'failed', error = coalesce(error, 'Stopped before it finished'), lease_until = null, updated_at = $1
       where status = 'working' and lease_until < $1 and attempts >= $2`,
      [now, maxAttempts],
    );
    const { rows } = await this.pool.query(
      `update agent_jobs set status = 'working', attempts = attempts + 1, lease_until = $2, updated_at = $1
       where id in (
         select id from agent_jobs
         where attempts < $4 and (status = 'pending' or (status = 'working' and lease_until < $1))
         order by created_at, operator_id
         limit $3
         for update skip locked
       )
       returning *`,
      [now, leaseUntil, limit, maxAttempts],
    );
    return rows.map(toJob);
  }

  async finish(id: string, outcome: { ok: true } | { ok: false; error: string; retry: boolean }): Promise<void> {
    if (outcome.ok) {
      await this.pool.query("update agent_jobs set status = 'done', error = null, lease_until = null, updated_at = now() where id = $1", [id]);
      return;
    }
    // A retry goes back to pending unless it already used its attempts (claim skips it then; it is failed below).
    await this.pool.query(
      `update agent_jobs set status = case when $3 and attempts < $4 then 'pending' else 'failed' end,
         error = $2, lease_until = null, updated_at = now() where id = $1`,
      [id, outcome.error.slice(0, 2000), outcome.retry, MAX_ATTEMPTS],
    );
  }

  async progress(runId: string): Promise<{ pending: number; working: number; done: number; failed: number }> {
    const { rows } = await this.pool.query<{ status: AgentJob['status']; n: string }>('select status, count(*) as n from agent_jobs where run_id = $1 group by status', [runId]);
    const counts = { pending: 0, working: 0, done: 0, failed: 0 };
    for (const r of rows) counts[r.status] = Number(r.n);
    return counts;
  }

  async recentRuns(since: string): Promise<string[]> {
    const { rows } = await this.pool.query<{ run_id: string }>('select distinct run_id from agent_jobs where created_at >= $1', [since]);
    return rows.map((r) => r.run_id);
  }
}

/** How many times an assessment is tried before its job is marked failed. */
export const MAX_ATTEMPTS = 3;
