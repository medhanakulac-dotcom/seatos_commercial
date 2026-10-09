import { Pool, PoolClient, QueryResultRow } from 'pg';
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

type Queryable = Pool | PoolClient;
type Row = QueryResultRow;

const iso = (v: unknown): string => (v instanceof Date ? v.toISOString() : String(v));
const isoOrNull = (v: unknown): string | null => (v == null ? null : iso(v));
const SETTINGS_KEY = 'workspace';

const toOperatorLink = (r: Row): OperatorLink => ({
  accountId: r.account_id,
  status: r.status,
  tmsOperatorId: r.tms_operator_id,
  tmsOperatorName: r.tms_operator_name,
  source: r.source,
  candidates: r.candidates,
  resolvedAt: iso(r.resolved_at),
  confirmedBy: r.confirmed_by,
});

const toRun = (r: Row): RunRecord => ({
  id: r.id,
  periodKey: r.period_key,
  label: r.label,
  trigger: r.trigger,
  status: r.status,
  agent: r.agent,
  playbookVersion: r.playbook_version,
  snapshotId: r.snapshot_id,
  summary: r.summary,
  error: r.error,
  triggeredBy: r.triggered_by,
  startedAt: iso(r.started_at),
  completedAt: isoOrNull(r.completed_at),
});

const toCase = (r: Row): CaseRecord => ({
  id: r.id,
  runId: r.run_id,
  caseRef: r.case_ref,
  operatorId: r.operator_id,
  operatorName: r.operator_name,
  owner: r.owner,
  segment: r.segment,
  health: r.health,
  crmHealth: r.crm_health,
  outcome: r.outcome,
  state: r.state,
  playbook: r.playbook,
  playType: r.play_type,
  signals: r.signals,
  analysis: r.analysis,
  nextStep: r.next_step,
  language: r.language,
  author: r.author,
  playbookVersion: r.playbook_version,
  currentDraftId: r.current_draft_id,
  rejectReason: r.reject_reason,
  voidNote: r.void_note,
  createdAt: iso(r.created_at),
  updatedAt: iso(r.updated_at),
});

const toDraft = (r: Row): DraftRecord => ({
  id: r.id,
  caseId: r.case_id,
  version: r.version,
  language: r.language,
  subject: r.subject,
  body: r.body,
  draftHash: r.draft_hash,
  author: r.author,
  writer: r.writer,
  mods: { short: false, warm: false, direct: false, variant: 0, ...r.mods },
  qa: r.qa,
  createdAt: iso(r.created_at),
});

const toEvent = (r: Row): CaseEvent => ({
  id: r.id,
  operatorId: r.operator_id,
  caseId: r.case_id,
  at: r.at,
  kind: r.kind,
  origin: r.origin,
  text: r.text,
  note: r.note,
  crmSync: r.crm_sync,
  crmError: r.crm_error,
});

const toJob = (r: Row): SendJobRecord => ({
  id: r.id,
  caseId: r.case_id,
  draftId: r.draft_id,
  draftHash: r.draft_hash,
  channel: r.channel,
  recipient: r.recipient,
  subject: r.subject,
  body: r.body,
  token: r.token,
  status: r.status,
  scheduledFor: iso(r.scheduled_for),
  attempts: r.attempts,
  deliveredTo: r.delivered_to,
  providerMessageId: r.provider_message_id,
  providerResponse: r.provider_response,
  claimedAt: isoOrNull(r.claimed_at),
  error: r.error,
  sentAt: isoOrNull(r.sent_at),
  createdAt: iso(r.created_at),
});

/** Postgres adapter for the workspace. Construct with a Pool; `transaction` re-binds to one client. */
export class PgWorkspaceStore implements WorkspaceStore {
  constructor(
    private readonly db: Queryable,
    private readonly pool: Pool | null = db instanceof Pool ? db : null,
  ) {}

  private async q(sql: string, params: unknown[] = []): Promise<Row[]> {
    return (await this.db.query(sql, params)).rows;
  }

  async transaction<T>(fn: (store: WorkspaceStore) => Promise<T>): Promise<T> {
    if (!this.pool) return fn(this); // already inside a transaction
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const result = await fn(new PgWorkspaceStore(client, null));
      await client.query('commit');
      return result;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async getSettings(): Promise<Partial<WorkspaceSettings> | undefined> {
    return (await this.q('select value from app_settings where key = $1', [SETTINGS_KEY]))[0]?.value;
  }

  async saveSettings(settings: WorkspaceSettings, updatedBy: string): Promise<void> {
    await this.q(
      `insert into app_settings (key, value, updated_at, updated_by) values ($1, $2, now(), $3)
       on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by`,
      [SETTINGS_KEY, JSON.stringify(settings), updatedBy],
    );
  }

  async insertSnapshot(s: SnapshotRecord): Promise<void> {
    await this.q(
      `insert into crm_snapshots (id, source, portal, description, pulled_at, content_hash, account_count, accounts)
       values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [s.id, s.meta.kind, s.meta.portal, s.meta.description, s.pulledAt, s.contentHash, s.accounts.length, JSON.stringify(s.accounts)],
    );
  }

  async getSnapshot(id: string): Promise<SnapshotRecord | undefined> {
    const r = (await this.q('select * from crm_snapshots where id = $1', [id]))[0];
    if (!r) return undefined;
    return {
      id: r.id,
      meta: { kind: r.source, portal: r.portal, description: r.description, pulledAt: iso(r.pulled_at).slice(0, 10) },
      pulledAt: iso(r.pulled_at),
      contentHash: r.content_hash,
      accounts: r.accounts,
    };
  }

  async createRun(run: RunRecord): Promise<RunRecord | null> {
    const rows = await this.q(
      `insert into workflow_runs (id, period_key, label, trigger, status, agent, playbook_version, snapshot_id, summary, error, triggered_by, started_at, completed_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       on conflict (kind, period_key) do nothing returning *`,
      [run.id, run.periodKey, run.label, run.trigger, run.status, run.agent, run.playbookVersion, run.snapshotId, run.summary, run.error, run.triggeredBy, run.startedAt, run.completedAt],
    );
    return rows[0] ? toRun(rows[0]) : null;
  }

  async getRun(id: string): Promise<RunRecord | undefined> {
    const r = (await this.q('select * from workflow_runs where id = $1', [id]))[0];
    return r && toRun(r);
  }

  async runForPeriod(periodKey: string): Promise<RunRecord | undefined> {
    const r = (await this.q(`select * from workflow_runs where kind = 'operator_watch' and period_key = $1`, [periodKey]))[0];
    return r && toRun(r);
  }

  async listRuns(limit: number): Promise<RunRecord[]> {
    return (await this.q('select * from workflow_runs order by started_at desc, id desc limit $1', [limit])).map(toRun);
  }

  async updateRun(run: RunRecord): Promise<void> {
    await this.q('update workflow_runs set status = $2, playbook_version = $3, summary = $4, error = $5, completed_at = $6 where id = $1', [
      run.id,
      run.status,
      run.playbookVersion,
      run.summary,
      run.error,
      run.completedAt,
    ]);
  }

  async nextCaseSeq(runId: string): Promise<number> {
    return (await this.q('update workflow_runs set case_seq = case_seq + 1 where id = $1 returning case_seq', [runId]))[0].case_seq;
  }

  private caseParams(c: CaseRecord): unknown[] {
    return [
      c.id, c.runId, c.caseRef, c.operatorId, c.operatorName, c.owner, c.segment, c.health, c.crmHealth, c.outcome, c.state, c.playbook, c.playType,
      JSON.stringify(c.signals), c.analysis, c.nextStep, c.language, c.author, c.playbookVersion, c.currentDraftId, c.rejectReason, c.voidNote, c.createdAt, c.updatedAt,
    ];
  }

  async insertCase(c: CaseRecord): Promise<void> {
    await this.q(
      `insert into operator_cases (id, run_id, case_ref, operator_id, operator_name, owner, segment, health, crm_health, outcome, state, playbook, play_type,
         signals, analysis, next_step, language, author, playbook_version, current_draft_id, reject_reason, void_note, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)`,
      this.caseParams(c),
    );
  }

  async updateCase(c: CaseRecord): Promise<void> {
    await this.q(
      `update operator_cases set operator_name=$5, owner=$6, segment=$7, health=$8, crm_health=$9, outcome=$10, state=$11, playbook=$12, play_type=$13,
         signals=$14, analysis=$15, next_step=$16, language=$17, author=$18, playbook_version=$19, current_draft_id=$20, reject_reason=$21, void_note=$22, updated_at=$24
       where id = $1 and run_id = $2 and case_ref = $3 and operator_id = $4 and created_at = $23`,
      this.caseParams(c),
    );
  }

  async getCase(id: string): Promise<CaseRecord | undefined> {
    const r = (await this.q('select * from operator_cases where id = $1', [id]))[0];
    return r && toCase(r);
  }

  async findCase(runId: string, operatorId: string): Promise<CaseRecord | undefined> {
    const r = (await this.q('select * from operator_cases where run_id = $1 and operator_id = $2', [runId, operatorId]))[0];
    return r && toCase(r);
  }

  async casesForRun(runId: string): Promise<CaseRecord[]> {
    return (await this.q('select * from operator_cases where run_id = $1 order by case_ref', [runId])).map(toCase);
  }

  async casesForOperator(operatorId: string): Promise<CaseRecord[]> {
    return (await this.q('select * from operator_cases where operator_id = $1 order by created_at desc', [operatorId])).map(toCase);
  }

  async expireOpenCases(exceptRunId: string, at: string): Promise<CaseRecord[]> {
    return (
      await this.q(`update operator_cases set state = 'expired', updated_at = $2 where run_id <> $1 and state in ('pending', 'hold') returning *`, [exceptRunId, at])
    ).map(toCase);
  }

  async insertDraft(d: DraftRecord): Promise<void> {
    await this.q(
      `insert into case_drafts (id, case_id, version, language, subject, body, draft_hash, author, writer, mods, qa, created_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [d.id, d.caseId, d.version, d.language, d.subject, d.body, d.draftHash, d.author, d.writer, JSON.stringify(d.mods), d.qa, d.createdAt],
    );
  }

  async getDraft(id: string): Promise<DraftRecord | undefined> {
    const r = (await this.q('select * from case_drafts where id = $1', [id]))[0];
    return r && toDraft(r);
  }

  async latestDraftVersion(caseId: string): Promise<number> {
    return (await this.q('select coalesce(max(version), 0) as v from case_drafts where case_id = $1', [caseId]))[0].v;
  }

  async insertDecision(d: DecisionRecord): Promise<void> {
    await this.q(
      `insert into case_decisions (id, case_id, draft_id, decision, reason, channel, recipient, actor_id, actor_name, created_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [d.id, d.caseId, d.draftId, d.decision, d.reason, d.channel, d.recipient, d.actorId, d.actorName, d.createdAt],
    );
  }

  async insertEvent(e: CaseEvent): Promise<void> {
    await this.q(
      `insert into case_events (id, operator_id, case_id, at, kind, origin, text, note, crm_sync, crm_error) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [e.id, e.operatorId, e.caseId, e.at, e.kind, e.origin, e.text, e.note ?? null, e.crmSync ?? null, e.crmError ?? null],
    );
  }

  async updateEvent(e: CaseEvent): Promise<void> {
    await this.q('update case_events set crm_sync = $2, crm_error = $3 where id = $1', [e.id, e.crmSync ?? null, e.crmError ?? null]);
  }

  async eventsForOperator(operatorId: string): Promise<CaseEvent[]> {
    return (await this.q('select * from case_events where operator_id = $1 order by created_at, id', [operatorId])).map(toEvent);
  }

  async insertChatMessage(m: ChatMessage): Promise<void> {
    await this.q('insert into chat_messages (id, operator_id, role, author_id, author_name, text, created_at) values ($1,$2,$3,$4,$5,$6,$7)', [
      m.id, m.operatorId, m.role, m.authorId, m.authorName, m.text, m.at,
    ]);
  }

  async chatMessages(operatorId: string, limit: number): Promise<ChatMessage[]> {
    const rows = await this.q('select * from (select * from chat_messages where operator_id = $1 order by created_at desc, id desc limit $2) t order by created_at, id', [operatorId, limit]);
    return rows.map((r: any) => ({ id: r.id, operatorId: r.operator_id, role: r.role, authorId: r.author_id, authorName: r.author_name, text: r.text, at: new Date(r.created_at).toISOString() }));
  }

  async recentActivity(limit: number): Promise<CaseEvent[]> {
    return (await this.q(`select * from case_events where origin = 'user' order by created_at desc limit $1`, [limit])).map(toEvent);
  }

  async insertSendJob(j: SendJobRecord): Promise<void> {
    await this.q(
      `insert into send_jobs (id, case_id, draft_id, draft_hash, channel, recipient, subject, body, token, status, scheduled_for, attempts, delivered_to, provider_message_id, provider_response, claimed_at, error, sent_at, created_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
      [j.id, j.caseId, j.draftId, j.draftHash, j.channel, j.recipient, j.subject, j.body, j.token, j.status, j.scheduledFor, j.attempts, j.deliveredTo, j.providerMessageId, j.providerResponse, j.claimedAt, j.error, j.sentAt, j.createdAt],
    );
  }

  async updateSendJob(j: SendJobRecord): Promise<void> {
    await this.q(
      'update send_jobs set status = $2, scheduled_for = $3, attempts = $4, delivered_to = $5, provider_message_id = $6, provider_response = $7, error = $8, sent_at = $9 where id = $1',
      [j.id, j.status, j.scheduledFor, j.attempts, j.deliveredTo, j.providerMessageId, j.providerResponse, j.error, j.sentAt],
    );
  }

  async sendJobsForCases(caseIds: string[]): Promise<SendJobRecord[]> {
    if (!caseIds.length) return [];
    return (await this.q('select * from send_jobs where case_id = any($1::uuid[]) order by created_at', [caseIds])).map(toJob);
  }

  async listSendJobs(limit: number): Promise<SendJobRecord[]> {
    return (await this.q(`select * from send_jobs where status <> 'cancelled' order by created_at desc limit $1`, [limit])).map(toJob);
  }

  async cancelQueuedJobs(caseId: string): Promise<number> {
    return (await this.q(`update send_jobs set status = 'cancelled' where case_id = $1 and status = 'queued' returning id`, [caseId])).length;
  }

  async claimDueJobs(now: string, limit: number): Promise<SendJobRecord[]> {
    return (
      await this.q(
        `update send_jobs set status = 'sending', attempts = attempts + 1, claimed_at = $1
         where id in (select id from send_jobs where status = 'queued' and scheduled_for <= $1 order by scheduled_for limit $2 for update skip locked)
         returning *`,
        [now, limit],
      )
    ).map(toJob);
  }

  async failStaleJobs(claimedBefore: string, error: string): Promise<SendJobRecord[]> {
    return (
      await this.q(`update send_jobs set status = 'failed', error = $2 where status = 'sending' and coalesce(claimed_at, created_at) < $1 returning *`, [claimedBefore, error])
    ).map(toJob);
  }

  async countSent(): Promise<number> {
    return Number((await this.q(`select count(*) as n from send_jobs where status = 'sent'`))[0].n);
  }

  async getOperatorLink(accountId: string): Promise<OperatorLink | undefined> {
    const rows = await this.q('select * from operator_links where account_id = $1', [accountId]);
    return rows[0] && toOperatorLink(rows[0]);
  }

  async saveOperatorLink(l: OperatorLink): Promise<void> {
    await this.q(
      `insert into operator_links (account_id, status, tms_operator_id, tms_operator_name, source, candidates, resolved_at, confirmed_by)
       values ($1,$2,$3,$4,$5,$6::jsonb,$7,$8)
       on conflict (account_id) do update set status = excluded.status, tms_operator_id = excluded.tms_operator_id,
         tms_operator_name = excluded.tms_operator_name, source = excluded.source, candidates = excluded.candidates,
         resolved_at = excluded.resolved_at, confirmed_by = excluded.confirmed_by`,
      [l.accountId, l.status, l.tmsOperatorId, l.tmsOperatorName, l.source, JSON.stringify(l.candidates), l.resolvedAt, l.confirmedBy],
    );
  }

  async listOperatorLinks(accountIds?: readonly string[]): Promise<OperatorLink[]> {
    const rows = accountIds
      ? await this.q('select * from operator_links where account_id = any($1::text[])', [accountIds])
      : await this.q('select * from operator_links');
    return rows.map(toOperatorLink);
  }
}
