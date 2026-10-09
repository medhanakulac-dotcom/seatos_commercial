import { createHash } from 'node:crypto';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import {
  CaseRecord,
  DraftRecord,
  Language,
  LANGUAGES,
  PlayType,
  RunRecord,
  Signal,
  SnapshotRecord,
} from '../entities/workspace.entities';
import { AccountNotFoundError, CaseStateError, WorkspaceError } from '../errors/workspace.errors';
import {
  AGENT_TRIGGER,
  AgentDispatch,
  AgentTrigger,
  Clock,
  CRM_ACCOUNT_SOURCE,
  CrmAccountSource,
  DRAFT_WRITER,
  DraftWriter,
  WORKSPACE_CLOCK,
  WORKSPACE_STORE,
  WorkspaceStore,
} from '../types/repositories/workspace.ports';
import { currentPeriod, wallClock } from '../value-objects/schedule';
import { assessAccount } from './local-playbook.agent';
import { DETECTORS, healthFromCrm, languageForCountry, playbookFor, playTypeFor } from './playbook.rules';
import { WorkspaceSettings } from './settings';
import { OperatorLinkService } from './operator-link.service';
import { draftHash, newEvent, newId, SettingsService } from './workspace.shared';

/** What an agent submits for one operator in a run (via MCP, or the local playbook). */
export interface CaseSubmission {
  readonly operatorId: string;
  readonly needsOutreach: boolean;
  readonly analysis: string;
  readonly nextStep?: string;
  readonly reason?: string;
  readonly playbook?: string;
  readonly playType?: PlayType;
  readonly language?: Language;
  readonly signals?: readonly { detector: string; text: string; code?: string }[];
  readonly draft?: { subject: string; body: string; language?: Language };
}

export interface SubmissionResult {
  readonly caseRef: string;
  readonly outcome: 'outreach' | 'no_action';
  readonly state: string;
  readonly draftVersion: number | null;
  readonly guard: string | null;
}

/** A scheduled run missed by more than this (e.g. the server was down) waits for the next slot. */
const CATCH_UP_MS = 6 * 36e5;
/**
 * A built-in (local) run still open after this long was cut off — on Vercel a function stops after 300 s — and the
 * next tick finishes it. Longer than that limit, so the original invocation is surely gone.
 */
const RESUME_LOCAL_AFTER_MS = 6 * 60_000;
const MAX_TEXT = 20_000;

/**
 * Opens pipeline runs (scheduled or manual), freezes the CRM snapshot they reason over,
 * expires last run's unfinished cases, hands the run to the agent, and accepts its submissions.
 */
@Injectable()
export class RunService {
  private readonly logger = new Logger(RunService.name);
  private readonly snapshots = new Map<string, SnapshotRecord>();
  private starting?: Promise<RunRecord | null>;

  constructor(
    @Inject(WORKSPACE_STORE) private readonly store: WorkspaceStore,
    @Inject(CRM_ACCOUNT_SOURCE) private readonly crm: CrmAccountSource,
    @Inject(AGENT_TRIGGER) private readonly agent: AgentTrigger,
    @Inject(DRAFT_WRITER) private readonly writer: DraftWriter,
    @Inject(WORKSPACE_CLOCK) private readonly clock: Clock,
    private readonly settings: SettingsService,
    @Optional() private readonly operatorLinks?: OperatorLinkService,
  ) {}

  async latestRun(): Promise<RunRecord | undefined> {
    return (await this.store.listRuns(1))[0];
  }

  async previousRun(): Promise<RunRecord | undefined> {
    return (await this.store.listRuns(2))[1];
  }

  async snapshot(id: string): Promise<SnapshotRecord> {
    const cached = this.snapshots.get(id);
    if (cached) return cached;
    const snapshot = await this.store.getSnapshot(id);
    if (!snapshot) throw new WorkspaceError(`Snapshot ${id} is missing`);
    this.snapshots.set(id, snapshot);
    return snapshot;
  }

  /** Scheduler tick: opens the run for the current period once, if the pipeline is enabled. */
  async tick(): Promise<RunRecord | null> {
    await this.resumeLocalRun();
    const settings = await this.settings.get();
    if (!settings.pipeline.enabled) return null;
    const now = this.clock.now();
    const period = currentPeriod(now, settings.pipeline);
    if (now.getTime() - period.opensAt.getTime() > CATCH_UP_MS) return null;
    if (await this.store.runForPeriod(period.key)) return null;
    return this.startRun('schedule', 'scheduler');
  }

  /** Opens a run. Concurrent calls share one start; a duplicate scheduled period returns null. */
  startRun(trigger: 'schedule' | 'manual', triggeredBy: string): Promise<RunRecord | null> {
    this.starting ??= this.open(trigger, triggeredBy).finally(() => (this.starting = undefined));
    return this.starting;
  }

  private async open(trigger: 'schedule' | 'manual', triggeredBy: string): Promise<RunRecord | null> {
    const settings = await this.settings.get();
    const now = this.clock.now();
    const nowIso = now.toISOString();
    const period =
      trigger === 'schedule'
        ? currentPeriod(now, settings.pipeline)
        : { key: `manual:${nowIso}`, label: `${manualLabel(now, settings.pipeline.timezone)} (manual)` };
    if (trigger === 'schedule' && (await this.store.runForPeriod(period.key))) return null;

    const pulled = await this.crm.snapshot();
    const snapshot: SnapshotRecord = {
      id: newId(),
      meta: pulled.meta,
      pulledAt: nowIso,
      contentHash: createHash('sha256').update(JSON.stringify(pulled.accounts)).digest('hex'),
      accounts: pulled.accounts,
    };
    const run: RunRecord = {
      id: newId(),
      periodKey: period.key,
      label: period.label,
      trigger,
      status: 'running',
      agent: settings.agent.mode,
      playbookVersion: settings.agent.playbookVersion || null,
      snapshotId: snapshot.id,
      summary: null,
      error: null,
      triggeredBy,
      startedAt: nowIso,
      completedAt: null,
    };

    const created = await this.store
      .transaction(async (tx) => {
        await tx.insertSnapshot(snapshot);
        const inserted = await tx.createRun(run);
        // Another instance won this period: roll back so its duplicate snapshot is not kept.
        if (!inserted) throw new DuplicatePeriod();
        const expired = await tx.expireOpenCases(run.id, nowIso);
        for (const c of expired) {
          await tx.insertEvent(newEvent({ operatorId: c.operatorId, caseId: c.id, kind: 'bad', origin: 'system', at: nowIso, text: `Case ${c.caseRef} expired: run ${run.label} started` }));
        }
        return inserted;
      })
      .catch((error: unknown) => {
        if (error instanceof DuplicatePeriod) return null;
        throw error;
      });
    if (!created) return null;
    this.snapshots.set(snapshot.id, snapshot);
    this.logger.log(`Run ${run.label} opened (${trigger}, ${snapshot.accounts.length} operators, agent ${run.agent})`);

    // Background pass: never delays the run; accounts that are not linked yet are resolved for later runs and chats.
    void this.operatorLinks?.resolveAll(snapshot.accounts).catch((error) => this.logger.warn(`SeatOS operator link pass failed: ${error instanceof Error ? error.message : String(error)}`));
    const tmsIds = await this.operatorLinks?.linkedIds(snapshot.accounts.map((a) => a.id)).catch(() => new Map<string, number>());

    try {
      if (run.agent === 'local') await this.runLocalAgent(run, snapshot);
      else {
        const dispatch = await this.agent.trigger(
          {
            runId: run.id,
            label: run.label,
            snapshotId: snapshot.id,
            operatorCount: snapshot.accounts.length,
            operators: snapshot.accounts.map((a) => ({ id: a.id, name: a.name, ...(tmsIds?.has(a.id) ? { tmsOperatorId: tmsIds.get(a.id) } : {}) })),
            trigger,
          },
          settings,
        );
        if (dispatch) void this.settleDispatch(run.id, snapshot, dispatch);
      }
    } catch (error) {
      await this.failRun(run.id, `Agent could not start: ${error instanceof Error ? error.message : String(error)}`);
    }
    return run;
  }

  /** For agents that work through the backend one operator at a time: close the run once every operator has a case. */
  private async settleDispatch(runId: string, snapshot: SnapshotRecord, dispatch: AgentDispatch): Promise<void> {
    try {
      const summary = await dispatch.finished;
      const submitted = new Set((await this.store.casesForRun(runId)).map((c) => c.operatorId));
      const missing = snapshot.accounts.filter((a) => !submitted.has(a.id)).length;
      if (missing) await this.failRun(runId, `Agent finished but ${missing} of ${snapshot.accounts.length} operators have no case. ${summary}`);
      else await this.completeRun(runId, summary);
    } catch (error) {
      await this.failRun(runId, `Agent could not finish: ${error instanceof Error ? error.message : String(error)}`).catch(() => undefined);
    }
  }

  /** Assesses every operator that has no case yet in this run, then closes it. Safe to call again on a cut-off run. */
  private async runLocalAgent(run: RunRecord, snapshot: SnapshotRecord): Promise<void> {
    const done = new Set((await this.store.casesForRun(run.id)).map((c) => c.operatorId));
    for (const account of snapshot.accounts) {
      if (done.has(account.id)) continue;
      await this.submitCase(run.id, assessAccount(account, snapshot.meta.pulledAt, this.writer), 'agent:local');
    }
    const outreach = (await this.store.casesForRun(run.id)).filter((c) => c.outcome === 'outreach').length;
    await this.completeRun(run.id, `Local playbook assessed ${snapshot.accounts.length} operators; ${outreach} need outreach.`);
  }

  /** Finishes the latest built-in run if it was cut off before every operator had a case. */
  private async resumeLocalRun(): Promise<void> {
    const run = await this.latestRun();
    if (!run || run.status !== 'running' || run.agent !== 'local') return;
    if (this.clock.now().getTime() - Date.parse(run.startedAt) < RESUME_LOCAL_AFTER_MS) return;
    this.logger.warn(`Run ${run.label} was cut off; finishing it`);
    const { snapshot } = await this.operatorsForRun(run.id);
    await this.runLocalAgent(run, snapshot);
  }

  async operatorsForRun(runId: string): Promise<{ run: RunRecord; snapshot: SnapshotRecord }> {
    const run = await this.store.getRun(runId);
    if (!run) throw new WorkspaceError(`Run ${runId} not found`);
    return { run, snapshot: await this.snapshot(run.snapshotId) };
  }

  /**
   * Records an agent's assessment of one operator. Idempotent per (run, operator): resubmitting
   * updates the case and adds a draft version. Cases a person has already acted on are not overwritten,
   * and the guards block proactive email to Dormant/Healthy accounts whatever the agent proposes.
   */
  async submitCase(runId: string, input: CaseSubmission, author: string): Promise<SubmissionResult> {
    const settings = await this.settings.get();
    const { run, snapshot } = await this.operatorsForRun(runId);
    if (run.status !== 'running') throw new CaseStateError(`Run ${run.label} is ${run.status}; it no longer accepts cases`);
    const account = snapshot.accounts.find((a) => a.id === input.operatorId);
    if (!account) throw new AccountNotFoundError(input.operatorId);
    validateSubmission(input);

    const health = healthFromCrm(account.crmHealth);
    const dormant = account.segment === 'Dormant';
    const guard = input.needsOutreach ? guardReason(settings, dormant, health) : null;
    const outreach = input.needsOutreach && !guard;
    const nowIso = this.clock.now().toISOString();

    return this.store.transaction(async (tx) => {
      const existing = await tx.findCase(run.id, account.id);
      if (existing && !['pending', 'no_action', 'reactive'].includes(existing.state)) {
        throw new CaseStateError(`Case ${existing.caseRef} is already ${existing.state}; it can no longer be changed by the agent`);
      }
      const caseRef = existing?.caseRef ?? `${caseRefPrefix(run)}-${String(await tx.nextCaseSeq(run.id)).padStart(4, '0')}`;
      const language = input.draft?.language ?? input.language ?? existing?.language ?? languageForCountry(account.country);
      const c: CaseRecord = {
        id: existing?.id ?? newId(),
        runId: run.id,
        caseRef,
        operatorId: account.id,
        operatorName: account.name,
        owner: account.owner,
        segment: account.segment,
        health,
        crmHealth: account.crmHealth,
        outcome: outreach ? 'outreach' : 'no_action',
        state: outreach ? 'pending' : dormant ? 'reactive' : 'no_action',
        playbook: input.playbook?.trim() || playbookFor(account.segment, health).name,
        playType: input.playType ?? playTypeFor(health),
        signals: (input.signals ?? []).map(toSignal),
        analysis: input.analysis.trim(),
        nextStep: (outreach ? input.nextStep : input.reason ?? input.nextStep)?.trim() ?? '',
        language,
        author,
        playbookVersion: run.playbookVersion,
        currentDraftId: outreach ? (existing?.currentDraftId ?? null) : null,
        rejectReason: null,
        voidNote: null,
        createdAt: existing?.createdAt ?? nowIso,
        updatedAt: nowIso,
      };
      if (existing) await tx.updateCase(c);
      else await tx.insertCase(c);

      const who = author.replace(/^agent:/, '');
      const event = (text: string, kind: 'sys' | 'ai' | 'bad' = 'sys') => tx.insertEvent(newEvent({ operatorId: c.operatorId, caseId: c.id, kind, origin: 'agent', at: nowIso, text }));
      if (!existing) {
        await event(
          outreach
            ? `Case ${caseRef} created by ${who} · playbook ${c.playbook} (${c.segment} + ${health})`
            : dormant
              ? `Case ${caseRef} · Reactive Only (no outreach)`
              : `Case ${caseRef} · ${who} found no outreach needed${c.nextStep ? `: ${c.nextStep}` : ''}`,
        );
      } else await event(`Case ${caseRef} updated by ${who}`);
      if (guard) await event(`Outreach blocked by guard: ${guard}`, 'bad');

      let draftVersion: number | null = null;
      if (outreach && input.draft) {
        draftVersion = (await tx.latestDraftVersion(c.id)) + 1;
        const draft: DraftRecord = {
          id: newId(),
          caseId: c.id,
          version: draftVersion,
          language,
          subject: input.draft.subject.trim(),
          body: input.draft.body,
          draftHash: draftHash(caseRef, input.draft.subject.trim(), input.draft.body),
          author,
          writer: author === 'agent:local' ? 'template' : 'agent',
          mods: { short: false, warm: false, direct: false, variant: 0 },
          qa: 'not_run',
          createdAt: nowIso,
        };
        await tx.insertDraft(draft);
        c.currentDraftId = draft.id;
        await tx.updateCase(c);
        await event(`Draft v${draftVersion} written by ${who}`, 'ai');
      }
      return { caseRef, outcome: c.outcome, state: c.state, draftVersion, guard };
    });
  }

  async completeRun(runId: string, summary: string): Promise<RunRecord> {
    const run = await this.store.getRun(runId);
    if (!run) throw new WorkspaceError(`Run ${runId} not found`);
    if (run.status !== 'running') throw new CaseStateError(`Run ${run.label} is already ${run.status}`);
    run.status = 'completed';
    run.summary = summary.slice(0, 4000) || null;
    run.completedAt = this.clock.now().toISOString();
    await this.store.updateRun(run);
    return run;
  }

  async failRun(runId: string, error: string): Promise<void> {
    const run = await this.store.getRun(runId);
    if (!run || run.status !== 'running') return;
    run.status = 'failed';
    run.error = error.slice(0, 4000);
    run.completedAt = this.clock.now().toISOString();
    await this.store.updateRun(run);
    this.logger.error(`Run ${run.label} failed: ${error}`);
  }
}

class DuplicatePeriod extends Error {}

function guardReason(settings: WorkspaceSettings, dormant: boolean, health: string): string | null {
  if (dormant && settings.guards.blockDormant) return 'Dormant accounts are reactive only';
  if (health === 'Healthy' && settings.guards.blockHealthy) return 'Healthy accounts get no proactive email';
  return null;
}

function toSignal(s: { detector: string; text: string; code?: string }): Signal {
  return { detector: s.detector.trim().slice(0, 60), code: s.code?.trim().slice(0, 20) || DETECTORS[s.detector.trim()] || 'AGT', text: s.text.trim().slice(0, 300) };
}

function validateSubmission(input: CaseSubmission): void {
  const fail = (m: string) => {
    throw new CaseStateError(m);
  };
  if (!input.analysis?.trim()) fail('analysis is required');
  if (input.analysis.length > MAX_TEXT) fail('analysis is too long');
  if (input.language && !LANGUAGES.includes(input.language)) fail(`language must be one of ${LANGUAGES.join(', ')}`);
  if (input.draft) {
    if (!input.needsOutreach) fail('a draft is only accepted when needsOutreach is true');
    if (!input.draft.subject?.trim() || input.draft.subject.length > 300) fail('draft.subject is required (max 300 chars)');
    if (!input.draft.body?.trim() || input.draft.body.length > MAX_TEXT) fail(`draft.body is required (max ${MAX_TEXT} chars)`);
    if (input.draft.language && !LANGUAGES.includes(input.draft.language)) fail(`draft.language must be one of ${LANGUAGES.join(', ')}`);
  }
  if ((input.signals?.length ?? 0) > 20) fail('at most 20 signals');
}

/** Scheduled runs number cases by their period (2026-W40-0001); manual ones by start time (M260930114005-0001). */
function caseRefPrefix(run: RunRecord): string {
  return run.trigger === 'schedule' ? run.label : `M${run.startedAt.replace(/\D/g, '').slice(2, 14)}`;
}

function manualLabel(now: Date, timeZone: string): string {
  const w = wallClock(now, timeZone);
  return `${w.year}-${String(w.month).padStart(2, '0')}-${String(w.day).padStart(2, '0')} ${String(Math.floor(w.minutes / 60)).padStart(2, '0')}:${String(w.minutes % 60).padStart(2, '0')}`;
}

