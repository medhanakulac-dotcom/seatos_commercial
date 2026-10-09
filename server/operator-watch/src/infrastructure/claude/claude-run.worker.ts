import { Logger } from '@nestjs/common';
import { z } from 'zod/v4';
import { LANGUAGES } from '../../domain/workspace/entities/workspace.entities';
import { CaseStateError } from '../../domain/workspace/errors/workspace.errors';
import { CaseSubmission, RunService } from '../../domain/workspace/services/run.service';
import { AgentJob, AgentJobQueue, CrmActivitySource, WeeklyTicketRecord, WeeklyUsageRecord, WorkspaceStore } from '../../domain/workspace/types/repositories/workspace.ports';
import { MAX_ATTEMPTS } from '../database/pg-agent.store';
import { CLAUDE_AUTHOR } from './claude.agent';
import { ClaudeLike } from './claude.client';
import { ClaudeMemory } from './claude.memory';
import { ASSESS_SYSTEM, formatActivity, formatWeekly } from './claude.prompts';

/** Operators assessed side by side. */
const CONCURRENCY = Math.max(1, Number(process.env.OW_AGENT_CONCURRENCY) || 4);
/** Stop claiming new work after this long, so a tick ends well inside the function's time limit. */
const DEFAULT_BUDGET_MS = Number(process.env.OW_AGENT_TICK_BUDGET_MS) || 50_000;
/** A claimed job is retried by a later tick if it is not finished by then (e.g. the function was stopped). */
const LEASE_MS = 5 * 60_000;
const RECALL_FOR_CASE = 'past assessments, outreach outcomes, decisions and the reasons behind them';
/** HubSpot engagements shown to Claude per assessment. */
const ACTIVITY_FOR_CASE = 20;
/** Weeks of uploaded SeatOS numbers shown per assessment. */
const WEEKS_FOR_CASE = 6;

/** Uploaded weekly numbers for one account (WeeklyDataService). */
export interface WeeklyNumbers {
  forAccount(accountId: string, weeks: number): Promise<{ usage: WeeklyUsageRecord[]; tickets: WeeklyTicketRecord[] }>;
}

/** The case Claude returns for one operator: the submit_case contract the Hermes skill used. */
export const AssessedCase = z.object({
  needs_outreach: z.boolean(),
  analysis: z.string().describe('1–3 sentences citing the snapshot'),
  next_step: z.string().optional(),
  reason: z.string().optional().describe('Why no outreach, when needs_outreach is false'),
  playbook: z.string().describe('Playbook name from the table'),
  play_type: z.enum(['Retention', 'Adoption', 'Commercial']),
  language: z.enum(LANGUAGES),
  signals: z.array(z.object({ detector: z.string(), text: z.string() })),
  draft: z.object({ subject: z.string(), body: z.string(), language: z.enum(LANGUAGES) }).optional(),
});
type AssessedCase = z.infer<typeof AssessedCase>;

export function toSubmission(operatorId: string, c: AssessedCase): CaseSubmission {
  return {
    operatorId,
    needsOutreach: c.needs_outreach,
    analysis: c.analysis,
    nextStep: c.next_step || undefined,
    reason: c.reason || undefined,
    playbook: c.playbook,
    playType: c.play_type,
    language: c.language,
    signals: c.signals.slice(0, 20),
    draft: c.needs_outreach && c.draft ? c.draft : undefined,
  };
}

/**
 * Works off Claude-mode runs: claims queued operators, has Claude assess each one (the operator-watch skill), submits
 * the case like the Hermes MCP tool did, remembers the assessment, and closes a run once all its operators are done.
 * Driven by the scheduler tick (/internal/tick) and kicked right after a manual "Run now".
 */
export class ClaudeRunWorker {
  private readonly logger = new Logger(ClaudeRunWorker.name);
  private running = false;

  constructor(
    private readonly runs: RunService,
    private readonly store: WorkspaceStore,
    private readonly queue: AgentJobQueue,
    private readonly claude: ClaudeLike | null,
    private readonly memory: ClaudeMemory | null,
    private readonly activity: CrmActivitySource | null = null,
    private readonly weekly: WeeklyNumbers | null = null,
  ) {}

  async processDue(budgetMs = DEFAULT_BUDGET_MS): Promise<{ assessed: number; failed: number; closed: number }> {
    const totals = { assessed: 0, failed: 0, closed: 0 };
    if (!this.claude || this.running) return totals;
    this.running = true;
    try {
      const deadline = Date.now() + budgetMs;
      while (Date.now() < deadline) {
        const now = new Date();
        const jobs = await this.queue.claim(CONCURRENCY, now.toISOString(), new Date(now.getTime() + LEASE_MS).toISOString(), MAX_ATTEMPTS);
        if (!jobs.length) break;
        const results = await Promise.all(jobs.map((job) => this.assess(job)));
        for (const ok of results) ok ? totals.assessed++ : totals.failed++;
      }
      totals.closed = await this.closeFinishedRuns();
      return totals;
    } finally {
      this.running = false;
    }
  }

  private async assess(job: AgentJob): Promise<boolean> {
    try {
      const { run, snapshot } = await this.runs.operatorsForRun(job.runId);
      if (run.status !== 'running') {
        await this.queue.finish(job.id, { ok: false, error: `Run ${run.label} is ${run.status}`, retry: false });
        return false;
      }
      const account = snapshot.accounts.find((a) => a.id === job.operatorId);
      if (!account) {
        await this.queue.finish(job.id, { ok: false, error: 'Operator is not in the run snapshot', retry: false });
        return false;
      }
      const history = (await this.store.casesForOperator(job.operatorId)).filter((c) => c.runId !== run.id).slice(0, 5);
      const remembered = (await this.memory?.recall(job.operatorId, RECALL_FOR_CASE)) ?? '';
      const weeklyNumbers = this.weekly ? formatWeekly(await this.weekly.forAccount(job.operatorId, WEEKS_FOR_CASE)) : '';
      const activity = this.activity?.connected
        ? await this.activity.activity(account, ACTIVITY_FOR_CASE).then(formatActivity, (error) => `HubSpot activity could not be read (${error instanceof Error ? error.message : String(error)}).`)
        : '';
      const user = [
        `Operator Watch run ${run.label}. HubSpot snapshot pulled ${snapshot.meta.pulledAt}; today is ${new Date().toISOString().slice(0, 10)}.`,
        job.tmsOperatorId != null ? `SeatOS operator_id: ${job.tmsOperatorId}` : '',
        `Operator record:\n${JSON.stringify(account)}`,
        weeklyNumbers ? `Weekly SeatOS numbers (newest first):\n${weeklyNumbers}` : '',
        activity ? `Recent HubSpot activity (newest first):\n${activity}` : '',
        `Previous cases:\n${history.length ? JSON.stringify(history.map((c) => ({ case_ref: c.caseRef, playbook: c.playbook, outcome: c.outcome, state: c.state, analysis: c.analysis, created_at: c.createdAt }))) : 'none'}`,
        remembered,
      ]
        .filter(Boolean)
        .join('\n\n');
      const assessed = await this.claude!.structured({ system: ASSESS_SYSTEM, user, schema: AssessedCase, effort: 'medium' });
      const result = await this.runs.submitCase(run.id, toSubmission(job.operatorId, assessed), CLAUDE_AUTHOR.id);
      await this.queue.finish(job.id, { ok: true });
      await this.memory?.retain({
        operatorId: job.operatorId,
        operatorName: job.operatorName,
        kind: 'case',
        source: result.caseRef,
        text: [
          `Operator Watch assessment (${run.label}, case ${result.caseRef}).`,
          `Needs outreach: ${assessed.needs_outreach}`,
          `Analysis: ${assessed.analysis}`,
          ...(assessed.next_step ? [`Next step: ${assessed.next_step}`] : []),
          ...(assessed.reason ? [`Reason: ${assessed.reason}`] : []),
          `Playbook: ${assessed.playbook}`,
        ].join('\n'),
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // A person already acted on this case, or the run closed: retrying cannot help.
      const retry = !(error instanceof CaseStateError);
      this.logger.warn(`Assessment of ${job.operatorId} (attempt ${job.attempts}) failed: ${message}`);
      await this.queue.finish(job.id, { ok: false, error: message, retry }).catch(() => undefined);
      return false;
    }
  }

  /** Closes Claude runs whose queue is empty: completed when every operator has a case, failed otherwise. */
  private async closeFinishedRuns(): Promise<number> {
    let closed = 0;
    const since = new Date(Date.now() - 7 * 864e5).toISOString();
    for (const runId of await this.queue.recentRuns(since)) {
      const run = await this.store.getRun(runId);
      if (!run || run.status !== 'running') continue;
      const p = await this.queue.progress(runId);
      if (p.pending + p.working > 0) continue;
      const { snapshot } = await this.runs.operatorsForRun(runId);
      const submitted = new Set((await this.store.casesForRun(runId)).map((c) => c.operatorId));
      const missing = snapshot.accounts.filter((a) => !submitted.has(a.id)).length;
      const summary = `Claude assessed ${p.done} of ${snapshot.accounts.length} operators.`;
      try {
        if (missing) await this.runs.failRun(runId, `${summary} ${missing} have no case (${p.failed} failed after ${MAX_ATTEMPTS} attempts).`);
        else await this.runs.completeRun(runId, summary);
        closed++;
      } catch (error) {
        if (!(error instanceof CaseStateError)) throw error; // another tick closed it first
      }
    }
    return closed;
  }
}
