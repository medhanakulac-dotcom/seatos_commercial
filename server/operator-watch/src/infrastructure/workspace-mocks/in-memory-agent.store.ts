import { newId } from '../../domain/workspace/services/workspace.shared';
import { AgentJob, AgentJobQueue, AgentMemoryStore, MemoryFact, NewMemoryFact } from '../../domain/workspace/types/repositories/workspace.ports';
import { MAX_ATTEMPTS } from '../database/pg-agent.store';

type Job = AgentJob & { leaseUntil: string | null; createdAt: string };

/** Dev/test-only agent memory and queue: process-local, lost on restart. */
export class InMemoryAgentStore implements AgentMemoryStore, AgentJobQueue {
  readonly facts: (MemoryFact & { supersededBy: string | null })[] = [];
  readonly jobs: Job[] = [];
  private seq = 0;

  async forOperator(operatorId: string, limit: number): Promise<MemoryFact[]> {
    return this.current()
      .filter((f) => f.operatorId === operatorId)
      .slice(0, limit);
  }

  async team(query: string, limit: number): Promise<MemoryFact[]> {
    const words = query.toLowerCase().split(/\W+/).filter(Boolean);
    const score = (f: MemoryFact) => words.filter((w) => f.text.toLowerCase().includes(w)).length;
    return this.current()
      .filter((f) => f.operatorId === null)
      .sort((a, b) => score(b) - score(a))
      .slice(0, limit);
  }

  async remember(facts: readonly NewMemoryFact[], supersedes: readonly string[]): Promise<MemoryFact[]> {
    const added = facts.map((f) => ({ ...f, topics: [...f.topics], id: newId(), createdAt: this.stamp(), supersededBy: null }));
    for (const f of this.facts) if (supersedes.includes(f.id) && !f.supersededBy) f.supersededBy = added[0]?.id ?? f.id;
    this.facts.push(...added);
    return added.map(({ supersededBy: _s, ...f }) => f);
  }

  async enqueue(runId: string, operators: readonly { id: string; name: string; tmsOperatorId?: number }[]): Promise<void> {
    for (const op of operators) {
      if (this.jobs.some((j) => j.runId === runId && j.operatorId === op.id)) continue;
      this.jobs.push({ id: newId(), runId, operatorId: op.id, operatorName: op.name, tmsOperatorId: op.tmsOperatorId ?? null, status: 'pending', attempts: 0, error: null, leaseUntil: null, createdAt: this.stamp() });
    }
  }

  async claim(limit: number, now: string, leaseUntil: string, maxAttempts: number): Promise<AgentJob[]> {
    this.jobs.forEach((j, i) => {
      if (j.status === 'working' && (j.leaseUntil ?? '') < now && j.attempts >= maxAttempts) this.jobs[i] = { ...j, status: 'failed', error: j.error ?? 'Stopped before it finished', leaseUntil: null };
    });
    const due = this.jobs.filter((j) => j.attempts < maxAttempts && (j.status === 'pending' || (j.status === 'working' && (j.leaseUntil ?? '') < now))).slice(0, limit);
    return due.map((j) => {
      const claimed = { ...j, status: 'working' as const, attempts: j.attempts + 1, leaseUntil };
      this.jobs[this.jobs.indexOf(j)] = claimed;
      return claimed;
    });
  }

  async finish(id: string, outcome: { ok: true } | { ok: false; error: string; retry: boolean }): Promise<void> {
    const i = this.jobs.findIndex((j) => j.id === id);
    if (i < 0) return;
    const j = this.jobs[i];
    this.jobs[i] = outcome.ok
      ? { ...j, status: 'done', error: null, leaseUntil: null }
      : { ...j, status: outcome.retry && j.attempts < MAX_ATTEMPTS ? 'pending' : 'failed', error: outcome.error, leaseUntil: null };
  }

  async progress(runId: string): Promise<{ pending: number; working: number; done: number; failed: number }> {
    const counts = { pending: 0, working: 0, done: 0, failed: 0 };
    for (const j of this.jobs) if (j.runId === runId) counts[j.status]++;
    return counts;
  }

  async recentRuns(since: string): Promise<string[]> {
    return [...new Set(this.jobs.filter((j) => j.createdAt >= since).map((j) => j.runId))];
  }

  private current() {
    return this.facts.filter((f) => !f.supersededBy).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /** Strictly increasing timestamps, so "newest first" is stable in fast tests. */
  private stamp(): string {
    return new Date(Date.now() + this.seq++).toISOString();
  }
}
