import {
  CaseEvent,
  CaseRecord,
  ChatMessage,
  DecisionRecord,
  DraftRecord,
  OperatorLink,
  RunRecord,
  SendJobRecord,
  SnapshotRecord,
} from '../../domain/workspace/entities/workspace.entities';
import { WorkspaceSettings } from '../../domain/workspace/services/settings';
import { WorkspaceStore } from '../../domain/workspace/types/repositories/workspace.ports';

const clone = <T>(v: T): T => structuredClone(v);

/**
 * Process-local store with the same semantics as the Postgres adapter. For tests and for running
 * without DATABASE_URL in development; never used in production. `transaction` is not isolated.
 */
export class InMemoryWorkspaceStore implements WorkspaceStore {
  settings?: WorkspaceSettings;
  readonly snapshots = new Map<string, SnapshotRecord>();
  readonly runs: (RunRecord & { caseSeq: number })[] = [];
  readonly cases = new Map<string, CaseRecord>();
  readonly drafts = new Map<string, DraftRecord>();
  readonly decisions: DecisionRecord[] = [];
  readonly events: (CaseEvent & { seq: number })[] = [];
  readonly jobs = new Map<string, SendJobRecord>();
  readonly operatorLinks = new Map<string, OperatorLink>();
  private seq = 0;

  async transaction<T>(fn: (store: WorkspaceStore) => Promise<T>): Promise<T> {
    return fn(this);
  }

  async getSettings() {
    return this.settings && clone(this.settings);
  }
  async saveSettings(settings: WorkspaceSettings) {
    this.settings = clone(settings);
  }

  async insertSnapshot(s: SnapshotRecord) {
    this.snapshots.set(s.id, s);
  }
  async getSnapshot(id: string) {
    return this.snapshots.get(id);
  }

  async createRun(run: RunRecord) {
    if (this.runs.some((r) => r.periodKey === run.periodKey)) return null;
    this.runs.push({ ...clone(run), caseSeq: 0 });
    return clone(run);
  }
  async getRun(id: string) {
    const r = this.runs.find((x) => x.id === id);
    return r && strip(r);
  }
  async runForPeriod(periodKey: string) {
    const r = this.runs.find((x) => x.periodKey === periodKey);
    return r && strip(r);
  }
  async listRuns(limit: number) {
    return [...this.runs].reverse().slice(0, limit).map(strip);
  }
  async updateRun(run: RunRecord) {
    const r = this.runs.find((x) => x.id === run.id);
    if (r) Object.assign(r, clone(run));
  }
  async nextCaseSeq(runId: string) {
    const r = this.runs.find((x) => x.id === runId)!;
    return ++r.caseSeq;
  }

  async insertCase(c: CaseRecord) {
    this.cases.set(c.id, clone(c));
  }
  async updateCase(c: CaseRecord) {
    this.cases.set(c.id, clone(c));
  }
  async getCase(id: string) {
    const c = this.cases.get(id);
    return c && clone(c);
  }
  async findCase(runId: string, operatorId: string) {
    const c = [...this.cases.values()].find((x) => x.runId === runId && x.operatorId === operatorId);
    return c && clone(c);
  }
  async casesForRun(runId: string) {
    return [...this.cases.values()].filter((c) => c.runId === runId).map(clone);
  }
  async casesForOperator(operatorId: string) {
    const order = new Map(this.runs.map((r, i) => [r.id, i]));
    return [...this.cases.values()].filter((c) => c.operatorId === operatorId).sort((a, b) => order.get(b.runId)! - order.get(a.runId)!).map(clone);
  }
  async expireOpenCases(exceptRunId: string, at: string) {
    const expired: CaseRecord[] = [];
    for (const c of this.cases.values()) {
      if (c.runId !== exceptRunId && (c.state === 'pending' || c.state === 'hold')) {
        c.state = 'expired';
        c.updatedAt = at;
        expired.push(clone(c));
      }
    }
    return expired;
  }

  async insertDraft(d: DraftRecord) {
    this.drafts.set(d.id, clone(d));
  }
  async getDraft(id: string) {
    const d = this.drafts.get(id);
    return d && clone(d);
  }
  async latestDraftVersion(caseId: string) {
    return Math.max(0, ...[...this.drafts.values()].filter((d) => d.caseId === caseId).map((d) => d.version));
  }

  async insertDecision(d: DecisionRecord) {
    this.decisions.push(clone(d));
  }

  async insertEvent(e: CaseEvent) {
    this.events.push({ ...clone(e), seq: ++this.seq });
  }
  async updateEvent(e: CaseEvent) {
    const x = this.events.find((y) => y.id === e.id);
    if (x) Object.assign(x, { crmSync: e.crmSync, crmError: e.crmError });
  }
  async eventsForOperator(operatorId: string) {
    return this.events.filter((e) => e.operatorId === operatorId).map(({ seq: _seq, ...e }) => clone(e));
  }
  private readonly chat: ChatMessage[] = [];
  async insertChatMessage(m: ChatMessage) {
    this.chat.push(clone(m));
  }
  async chatMessages(operatorId: string, limit: number) {
    return this.chat.filter((m) => m.operatorId === operatorId).slice(-limit).map(clone);
  }

  async recentActivity(limit: number) {
    return this.events
      .filter((e) => e.origin === 'user')
      .sort((a, b) => b.seq - a.seq)
      .slice(0, limit)
      .map(({ seq: _seq, ...e }) => clone(e));
  }

  async insertSendJob(j: SendJobRecord) {
    this.jobs.set(j.id, clone(j));
  }
  async updateSendJob(j: SendJobRecord) {
    this.jobs.set(j.id, clone(j));
  }
  async sendJobsForCases(caseIds: string[]) {
    return [...this.jobs.values()].filter((j) => caseIds.includes(j.caseId)).map(clone);
  }
  async listSendJobs(limit: number) {
    return [...this.jobs.values()].filter((j) => j.status !== 'cancelled').reverse().slice(0, limit).map(clone);
  }
  async cancelQueuedJobs(caseId: string) {
    let n = 0;
    for (const j of this.jobs.values()) if (j.caseId === caseId && j.status === 'queued') (j.status = 'cancelled'), n++;
    return n;
  }
  async claimDueJobs(now: string, limit: number) {
    const due = [...this.jobs.values()].filter((j) => j.status === 'queued' && j.scheduledFor <= now).slice(0, limit);
    for (const j of due) {
      j.status = 'sending';
      j.attempts++;
      j.claimedAt = now;
    }
    return due.map(clone);
  }
  async failStaleJobs(claimedBefore: string, error: string) {
    const stale = [...this.jobs.values()].filter((j) => j.status === 'sending' && (j.claimedAt ?? j.createdAt) < claimedBefore);
    for (const j of stale) {
      j.status = 'failed';
      j.error = error;
    }
    return stale.map(clone);
  }
  async countSent() {
    return [...this.jobs.values()].filter((j) => j.status === 'sent').length;
  }

  async getOperatorLink(accountId: string) {
    const l = this.operatorLinks.get(accountId);
    return l && clone(l);
  }
  async saveOperatorLink(link: OperatorLink) {
    this.operatorLinks.set(link.accountId, clone(link));
  }
  async listOperatorLinks(accountIds?: readonly string[]) {
    return [...this.operatorLinks.values()].filter((l) => !accountIds || accountIds.includes(l.accountId)).map(clone);
  }
}

function strip(r: RunRecord & { caseSeq: number }): RunRecord {
  const { caseSeq: _caseSeq, ...run } = r;
  return clone(run);
}
