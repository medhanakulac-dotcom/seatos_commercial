import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import {
  Actor,
  CaseEvent,
  CaseRecord,
  CaseState,
  ChatMessage,
  CrmAccount,
  CrmActivity,
  DraftMods,
  DraftRecord,
  DraftWriterKind,
  Health,
  Language,
  OperatorLink,
  RewriteMode,
  RunRecord,
  SendChannel,
  SendJobRecord,
  Signal,
  SnapshotRecord,
} from '../entities/workspace.entities';
import { AccountNotFoundError, CaseStateError, WorkspaceError } from '../errors/workspace.errors';
import {
  ACCOUNT_ASSISTANT,
  AGENT_NOTIFIER,
  AgentEvent,
  AgentNotifier,
  CHAT_EVENTS,
  CRM_ACTIVITY,
  CrmActivitySource,
  ChatEvents,
  AccountAssistant,
  AccountContext,
  Clock,
  CRM_ACCOUNT_SOURCE,
  CRM_NOTE_SYNC,
  CrmAccountSource,
  CrmNoteSync,
  DRAFT_WRITER,
  DraftWriter,
  EMAIL_REWRITER,
  EmailRewriter,
  WORKSPACE_CLOCK,
  WORKSPACE_STORE,
  WorkspaceStore,
} from '../types/repositories/workspace.ports';
import { nextSlot, WEEKDAY_NAMES } from '../value-objects/schedule';
import { analyseAccount, describePlaybook, Playbook, playbookFor, priorityOf, PLAY_OUTBOX, RECOMMENDED_FEATURES } from './playbook.rules';
import { OperatorLinkService } from './operator-link.service';
import { RunService } from './run.service';
import { enabledChannels, WorkspaceSettings } from './settings';
import { CHANNEL_NAMES, draftHash, LANGUAGE_NAMES, newEvent, newId, newToken, ownerName, SettingsService } from './workspace.shared';

export type Decision = 'approve' | 'hold' | 'reject' | 'close' | 'reopen';
/** States shown in the UI: stored states plus "healthy" (no action on a Healthy account) and "no_case". */
export type ViewState = CaseState | 'healthy' | 'no_case';

export interface AccountView {
  readonly account: CrmAccount;
  readonly run: RunRecord | undefined;
  readonly case: CaseRecord | undefined;
  readonly health: Health;
  readonly dormant: boolean;
  readonly playbook: Playbook;
  readonly state: ViewState;
  readonly noSend: boolean;
  readonly drafted: boolean;
  readonly language: Language;
  readonly summary: string;
  readonly nextStep: string;
  readonly signals: readonly Signal[];
  readonly priority: number;
}

export interface AccountDetailView extends AccountView {
  readonly events: CaseEvent[];
  readonly history: CaseRecord[];
  readonly draft: DraftRecord | undefined;
  readonly sendJobs: SendJobRecord[];
  readonly runLabels: ReadonlyMap<string, string>;
  /** Stored SeatOS operator link; undefined until resolved. */
  readonly tmsLink: OperatorLink | undefined;
}

export interface OwnerWeekStats {
  owner: string | null;
  total: number;
  done: number;
  approved: number;
  closed: number;
  rejected: number;
  hold: number;
  pending: number;
  notDrafted: number;
}

const CHAT_HISTORY_LIMIT = 200;
/** Chat lines handed to the assistant with each question. */
const CHAT_HISTORY = 20;
/** The chat waits at most this long for the SeatOS operator id; a slow directory must not delay the answer. */
const LINK_WAIT_MS = 3000;
/** Bodies in agent notes are truncated: the agent needs the gist of an edit, not a full copy. */
const NOTE_BODY_MAX = 1500;
const clip = (text: string): string => (text.length > NOTE_BODY_MAX ? `${text.slice(0, NOTE_BODY_MAX)}…` : text);
const SYSTEM_AUTHOR: Actor = { id: 'system', name: 'System' };
const APPROVAL_VOIDED = 'Draft changed after approval — the approval no longer matches, so it needs approval again.';
const REVIEWABLE: readonly CaseState[] = ['pending', 'approved', 'hold', 'rejected'];
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

/** The Commercial Workspace read model and every action people take on cases. */
@Injectable()
export class WorkspaceService {
  private readonly logger = new Logger(WorkspaceService.name);
  private preview?: { at: number; snapshot: SnapshotRecord };

  constructor(
    @Inject(WORKSPACE_STORE) private readonly store: WorkspaceStore,
    @Inject(CRM_ACCOUNT_SOURCE) private readonly crm: CrmAccountSource,
    @Inject(CRM_NOTE_SYNC) private readonly notes: CrmNoteSync,
    @Inject(DRAFT_WRITER) private readonly writer: DraftWriter,
    @Inject(EMAIL_REWRITER) private readonly rewriter: EmailRewriter,
    @Inject(ACCOUNT_ASSISTANT) private readonly assistant: AccountAssistant,
    @Inject(WORKSPACE_CLOCK) private readonly clock: Clock,
    private readonly runs: RunService,
    private readonly settings: SettingsService,
    @Optional() @Inject(CHAT_EVENTS) private readonly chatEvents?: ChatEvents,
    @Optional() @Inject(AGENT_NOTIFIER) private readonly notifier?: AgentNotifier,
    @Optional() private readonly operatorLinks?: OperatorLinkService,
    @Optional() @Inject(CRM_ACTIVITY) private readonly crmActivity?: CrmActivitySource,
  ) {}

  /** With the local agent, the very first request opens a run so a fresh install shows cases. */
  async ready(): Promise<void> {
    if (await this.runs.latestRun()) return;
    const settings = await this.settings.get();
    if (settings.agent.mode === 'local') await this.runs.startRun('manual', 'system:bootstrap');
  }

  /** Current run and the snapshot it reasons over. Before any run exists, a live CRM preview (no cases). */
  async current(): Promise<{ run: RunRecord | undefined; snapshot: SnapshotRecord }> {
    const run = await this.runs.latestRun();
    if (run) return { run, snapshot: await this.runs.snapshot(run.snapshotId) };
    if (!this.preview || Date.now() - this.preview.at > 10 * 60_000) {
      const pulled = await this.crm.snapshot();
      this.preview = { at: Date.now(), snapshot: { id: 'preview', meta: pulled.meta, pulledAt: this.clock.now().toISOString(), contentHash: '', accounts: pulled.accounts } };
    }
    return { run: undefined, snapshot: this.preview.snapshot };
  }

  get capabilities() {
    return { assistant: this.assistant.connected, emailRewrite: this.rewriter.connected, crmNotes: this.notes.connected, drafts: this.writer.kind };
  }

  async meta() {
    const [{ run, snapshot }, previous, settings] = await Promise.all([this.current(), this.runs.previousRun(), this.settings.get()]);
    return { run, previous, snapshot, settings, sending: this.sendingInfo(settings) };
  }

  sendingInfo(settings: WorkspaceSettings) {
    const s = settings.sending;
    return {
      enabled: s.enabled,
      channels: enabledChannels(settings).map((id) => ({ id, label: CHANNEL_NAMES[id] })),
      defaultChannel: s.defaultChannel,
      schedule: s.schedule.mode === 'immediate' ? 'immediately' : `${WEEKDAY_NAMES[s.schedule.weekday].slice(0, 3)} ${s.schedule.time}`,
      redirected: !!s.redirectAllTo,
    };
  }

  async list(): Promise<AccountView[]> {
    const { run, snapshot } = await this.current();
    const cases = new Map((run ? await this.store.casesForRun(run.id) : []).map((c) => [c.operatorId, c]));
    return snapshot.accounts.map((a) => this.view(a, run, cases.get(a.id), snapshot.meta.pulledAt));
  }

  async get(operatorId: string): Promise<AccountDetailView> {
    const { run, snapshot } = await this.current();
    const account = snapshot.accounts.find((a) => a.id === operatorId);
    if (!account) throw new AccountNotFoundError(operatorId);
    const [history, events, runs, tmsLink] = await Promise.all([
      this.store.casesForOperator(operatorId),
      this.store.eventsForOperator(operatorId),
      this.store.listRuns(200),
      this.store.getOperatorLink(operatorId),
    ]);
    const current = run ? history.find((c) => c.runId === run.id) : undefined;
    const view = this.view(account, run, current, snapshot.meta.pulledAt);
    const draft = current?.currentDraftId ? await this.store.getDraft(current.currentDraftId) : undefined;
    const sendJobs = current ? await this.store.sendJobsForCases([current.id]) : [];
    return { ...view, events: [...crmEvents(account), ...events], history, draft, sendJobs, runLabels: new Map(runs.map((r) => [r.id, r.label])), tmsLink };
  }

  private view(account: CrmAccount, run: RunRecord | undefined, c: CaseRecord | undefined, referenceDate: string): AccountView {
    const insight = analyseAccount(account, referenceDate);
    const health = c?.health ?? insight.health;
    const dormant = account.segment === 'Dormant';
    const playbook = c ? { name: c.playbook, description: describePlaybook(c.playbook) } : playbookFor(account.segment, health);
    const state: ViewState = !c ? 'no_case' : c.state === 'no_action' && health === 'Healthy' ? 'healthy' : c.state;
    return {
      account,
      run,
      case: c,
      health,
      dormant,
      playbook,
      state,
      noSend: !c || c.outcome !== 'outreach',
      drafted: !!c?.currentDraftId,
      language: c?.language ?? 'en',
      summary: c?.analysis || insight.why,
      nextStep: c?.nextStep || insight.next,
      signals: c?.signals.length ? c.signals : insight.signals,
      priority: priorityOf(account.segment, health),
    };
  }

  // ── drafts ────────────────────────────────────────────────────────────────

  /** Template draft on demand for an outreach case the agent left undrafted. */
  async generateDraft(operatorId: string, actor: Actor): Promise<void> {
    const { c, account } = await this.currentCase(operatorId);
    if (c.outcome !== 'outreach') throw new CaseStateError('This account carries no email work in the current run');
    if (c.state === 'closed') throw new CaseStateError('The case is closed');
    if (c.currentDraftId) return;
    const mods: DraftMods = { short: false, warm: false, direct: false, variant: 0 };
    const rendered = this.render(c, account, c.language, mods);
    await this.store.transaction((tx) => this.addDraft(tx, c, { ...rendered, language: c.language, writer: 'template', mods }, `user:${actor.id}`, `Draft generated by ${actor.name} (template)`));
  }

  /** Shorter / warmer / more direct / regenerate — template drafts only. */
  async rewrite(operatorId: string, mode: RewriteMode, actor: Actor): Promise<void> {
    const { c, account, draft } = await this.editableDraft(operatorId);
    this.requireTemplate(draft);
    const mods = { ...draft.mods };
    if (mode === 'regen') mods.variant = (mods.variant + 1) % 3;
    else {
      const key = ({ shorter: 'short', warmer: 'warm', direct: 'direct' } as const)[mode];
      mods[key] = !mods[key];
    }
    const rendered = this.render(c, account, draft.language, mods);
    await this.store.transaction((tx) => this.addDraft(tx, c, { ...rendered, language: draft.language, writer: 'template', mods }, `user:${actor.id}`, mode === 'regen' ? 'Draft regenerated' : `Draft rewritten (${mode})`));
  }

  async changeLanguage(operatorId: string, language: Language, actor: Actor): Promise<void> {
    const { c, account, draft } = await this.editableDraft(operatorId);
    this.requireTemplate(draft);
    if (draft.language === language) return;
    const rendered = this.render(c, account, language, draft.mods);
    await this.store.transaction(async (tx) => {
      c.language = language;
      await this.addDraft(tx, c, { ...rendered, language, writer: 'template', mods: draft.mods }, `user:${actor.id}`, `Draft rewritten in ${LANGUAGE_NAMES[language]}`);
    });
  }

  async rewriteWithPrompt(operatorId: string, instruction: string, actor: Actor): Promise<{ applied: boolean; message: string }> {
    const { c, draft } = await this.editableDraft(operatorId);
    if (!this.rewriter.connected) return { applied: false, message: "The email AI isn't connected yet, so this prompt was not applied and the draft is unchanged." };
    let result: { subject?: string; body: string };
    try {
      const detail = await this.get(operatorId);
      result = await this.rewriter.rewrite({ account: accountContext(detail), language: draft.language, subject: draft.subject, body: draft.body, instruction });
    } catch (error) {
      return { applied: false, message: `The email AI returned an error: ${error instanceof Error ? error.message : String(error)}` };
    }
    if (!result.body?.trim()) return { applied: false, message: 'The email AI returned an empty draft' };
    const quoted = instruction.length > 80 ? `${instruction.slice(0, 80)}…` : instruction;
    await this.store.transaction((tx) =>
      this.addDraft(tx, c, { subject: result.subject || draft.subject, body: result.body, language: draft.language, writer: 'agent', mods: draft.mods }, `user:${actor.id}`, `AI rewrote the draft from a prompt: “${quoted}”`),
    );
    return { applied: true, message: 'Draft rewritten' };
  }

  // ── decisions ─────────────────────────────────────────────────────────────

  async decide(
    operatorId: string,
    decision: Decision,
    actor: Actor,
    options: { reason?: string; editedBody?: string; channel?: SendChannel; recipient?: string } = {},
  ): Promise<void> {
    const { c, account } = await this.currentCase(operatorId);
    const settings = await this.settings.get();
    const now = this.clock.now();
    const reason = options.reason?.trim() || undefined;
    let edit: { agentBody: string; finalBody: string } | undefined;
    await this.store.transaction(async (tx) => {
      const event = (kind: CaseEvent['kind'], text: string) => tx.insertEvent(newEvent({ operatorId, caseId: c.id, kind, origin: 'user', at: now.toISOString(), text }));
      if (decision === 'reopen') {
        if (c.state !== 'closed') throw new CaseStateError('Only closed cases can be reopened');
        c.state = 'pending';
        await this.saveDecision(tx, c, decision, actor, {});
        await event('note', `Case reopened by ${actor.name}`);
        return;
      }
      if (c.outcome !== 'outreach' || !REVIEWABLE.includes(c.state)) throw new CaseStateError(`Cannot ${decision} a case that is ${c.state}`);
      if (await this.alreadySent(tx, c)) throw new CaseStateError('This email has already been sent');
      if (c.state === 'approved') await tx.cancelQueuedJobs(c.id);

      switch (decision) {
        case 'approve': {
          if (!c.currentDraftId) throw new CaseStateError('Generate a draft before approving');
          if (options.editedBody !== undefined) {
            const current = (await tx.getDraft(c.currentDraftId))!;
            if (current.writer === 'agent') edit = { agentBody: clip(current.body), finalBody: clip(options.editedBody) };
            await this.addDraft(tx, c, { subject: current.subject, body: options.editedBody, language: current.language, writer: 'human', mods: current.mods }, `user:${actor.id}`, `Draft edited by ${actor.name}`);
          }
          const draft = (await tx.getDraft(c.currentDraftId!))!;
          const channel = options.channel ?? settings.sending.defaultChannel;
          if (!settings.sending[channel].enabled) throw new CaseStateError(`${CHANNEL_NAMES[channel]} is not enabled for sending`);
          const recipient = (options.recipient ?? account.contacts?.[0]?.email ?? '').trim();
          if (!EMAIL.test(recipient)) throw new CaseStateError('A valid recipient email is required to approve');
          const scheduledFor = settings.sending.schedule.mode === 'immediate' ? now : nextSlot(now, settings.sending.schedule.weekday, settings.sending.schedule.time, settings.pipeline.timezone);
          await tx.insertSendJob({
            id: newId(),
            caseId: c.id,
            draftId: draft.id,
            draftHash: draft.draftHash,
            channel,
            recipient,
            subject: draft.subject,
            body: draft.body,
            token: newToken(),
            status: 'queued',
            scheduledFor: scheduledFor.toISOString(),
            attempts: 0,
            deliveredTo: null,
            providerMessageId: null,
            providerResponse: null,
            claimedAt: null,
            error: null,
            sentAt: null,
            createdAt: now.toISOString(),
          });
          c.state = 'approved';
          c.voidNote = null;
          await this.saveDecision(tx, c, decision, actor, { channel, recipient, draftId: draft.id });
          const when = settings.sending.schedule.mode === 'immediate' ? 'queued to send now' : `queued for ${this.sendingInfo(settings).schedule}`;
          await event('ok', `Approved by ${actor.name} · via ${CHANNEL_NAMES[channel]} to ${recipient} · ${when}`);
          break;
        }
        case 'hold':
          c.state = 'hold';
          await this.saveDecision(tx, c, decision, actor, { reason });
          await event('note', `Put on hold by ${actor.name}`);
          break;
        case 'reject':
          c.state = 'rejected';
          c.rejectReason = options.reason?.trim() || 'no reason';
          await this.saveDecision(tx, c, decision, actor, { reason: c.rejectReason });
          await event('bad', `Returned to triage by ${actor.name}: “${c.rejectReason}”`);
          break;
        case 'close':
          c.state = 'closed';
          await this.saveDecision(tx, c, decision, actor, { reason });
          await event('note', `Case closed by ${actor.name} (removed from the queue)`);
          break;
      }
    });
    this.tellAgent({ type: 'decision', operatorId, caseRef: c.caseRef, decision, actor: actor.name, reason: decision === 'reject' ? c.rejectReason ?? undefined : reason, edit });
  }

  /** Not awaited: a reviewer's click never waits on the agent, and its failure never fails the decision. */
  private tellAgent(event: AgentEvent): void {
    void this.notifier?.notify(event).catch((error) => this.logger.warn(`Agent notification failed: ${error instanceof Error ? error.message : String(error)}`));
  }

  /** Approves every pending drafted case for a playbook (optionally one owner) to its main contact. */
  async bulkApprove(playbook: string, owner: string | null | undefined, actor: Actor, channel?: SendChannel): Promise<{ approved: number; skipped: number }> {
    const views = await this.list();
    const targets = views.filter((v) => v.state === 'pending' && v.drafted && v.playbook.name === playbook && (owner === undefined || v.account.owner === owner));
    let approved = 0;
    let skipped = 0;
    for (const v of targets) {
      const recipient = v.account.contacts?.[0]?.email;
      if (!recipient) {
        skipped++;
        continue;
      }
      await this.decide(v.account.id, 'approve', actor, { channel, recipient });
      approved++;
    }
    return { approved, skipped };
  }

  // ── notes & assistant ─────────────────────────────────────────────────────

  async addNote(operatorId: string, text: string, actor: Actor): Promise<CaseEvent> {
    const { run, snapshot } = await this.current();
    const account = snapshot.accounts.find((a) => a.id === operatorId);
    if (!account) throw new AccountNotFoundError(operatorId);
    const c = run ? await this.store.findCase(run.id, operatorId) : undefined;
    const event: CaseEvent = { ...newEvent({ operatorId, caseId: c?.id, kind: 'note', origin: 'user', at: this.clock.now().toISOString(), text: `Note · ${text}`, note: text }), crmSync: 'local' };
    await this.store.insertEvent(event);
    await this.pushNote(account, event, actor);
    return event;
  }

  async retryNote(operatorId: string, eventId: string, actor: Actor): Promise<CaseEvent> {
    const { snapshot } = await this.current();
    const account = snapshot.accounts.find((a) => a.id === operatorId);
    if (!account) throw new AccountNotFoundError(operatorId);
    const event = (await this.store.eventsForOperator(operatorId)).find((e) => e.id === eventId);
    if (!event?.note) throw new CaseStateError('Only notes logged in the workspace can be sent to HubSpot');
    if (event.crmSync !== 'synced') await this.pushNote(account, event, actor);
    return event;
  }

  private async pushNote(account: CrmAccount, event: CaseEvent, actor: Actor): Promise<void> {
    const deal = account.deals[0];
    if (!deal || !this.notes.connected || !event.note) return;
    try {
      await this.notes.pushNote({ dealId: deal.id, note: `${event.note}\n— ${actor.name}`, accountId: account.id, at: event.at });
      event.crmSync = 'synced';
      event.crmError = null;
    } catch (error) {
      event.crmSync = 'failed';
      event.crmError = error instanceof Error ? error.message : String(error);
    }
    await this.store.updateEvent(event);
  }

  /**
   * The chat about an operator is shared by the whole team: the question and the agent's answer are both stored with
   * who said them, and the agent is told which colleague is speaking.
   */
  async ask(operatorId: string, question: string, asker: Actor): Promise<{ connected: boolean; messages: ChatMessage[] }> {
    const detail = await this.get(operatorId);
    if (!this.assistant.connected) {
      return { connected: false, messages: [this.chatLine(operatorId, 'assistant', SYSTEM_AUTHOR, "The assistant isn't connected yet. Once a model is connected here, it will answer using this account's data.")] };
    }
    // The shared thread so far, oldest first, so an agent without its own session memory can follow the conversation.
    const history = (await this.store.chatMessages(operatorId, CHAT_HISTORY)).map((m) => ({ role: m.role, text: m.role === 'user' ? `${m.authorName}: ${m.text}` : m.text }));
    const asked = this.chatLine(operatorId, 'user', asker, question);
    await this.store.insertChatMessage(asked);
    this.chatEvents?.publish(operatorId, { type: 'message', message: asked });
    this.chatEvents?.publish(operatorId, { type: 'typing', operatorId, on: true, asker: asker.name });
    let answer: string;
    try {
      const tmsLink = (await this.linkWithin(detail, LINK_WAIT_MS)) ?? detail.tmsLink;
      answer = (await this.assistant.ask({ account: accountContext({ ...detail, tmsLink }), question, asker: asker.name, history })).trim() || '(no answer)';
    } catch (error) {
      answer = `The assistant returned an error: ${error instanceof Error ? error.message : String(error)}`;
    }
    const reply = this.chatLine(operatorId, 'assistant', this.assistant.author, answer);
    await this.store.insertChatMessage(reply);
    this.chatEvents?.publish(operatorId, { type: 'message', message: reply });
    this.chatEvents?.publish(operatorId, { type: 'typing', operatorId, on: false });
    return { connected: true, messages: [asked, reply] };
  }

  /** Resolves the SeatOS operator link, giving up (without cancelling it) after `ms`. */
  private async linkWithin(detail: AccountDetailView, ms: number): Promise<OperatorLink | null> {
    if (!this.operatorLinks) return null;
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<null>((resolve) => (timer = setTimeout(() => resolve(null), ms)));
    try {
      return await Promise.race([this.operatorLinks.resolve(detail.account), timeout]);
    } finally {
      clearTimeout(timer);
    }
  }

  /** A person picks the SeatOS operator for an account. */
  async confirmTmsLink(operatorId: string, tmsOperatorId: number, actor: Actor): Promise<void> {
    const { account } = await this.get(operatorId);
    await this.links().confirm(account, tmsOperatorId, actor);
  }

  /** Notes, meetings, calls, emails, tasks and logged messages for the account, read live from the CRM. */
  async crmActivityFor(operatorId: string, limit = 50): Promise<{ connected: boolean; items: CrmActivity[] }> {
    const { account } = await this.get(operatorId);
    if (!this.crmActivity?.connected) return { connected: false, items: [] };
    return { connected: true, items: await this.crmActivity.activity(account, limit) };
  }

  /** Looks the SeatOS operator up again, ignoring the 24h cache. */
  async resolveTmsLink(operatorId: string): Promise<void> {
    const { account } = await this.get(operatorId);
    await this.links().resolve(account, true);
  }

  private links(): OperatorLinkService {
    if (!this.operatorLinks) throw new WorkspaceError('SeatOS operator links are not available');
    return this.operatorLinks;
  }

  /** The shared chat thread for an operator, oldest first. */
  async conversation(operatorId: string): Promise<{ sessionId: string | null; messages: ChatMessage[] }> {
    await this.get(operatorId);
    return { sessionId: this.assistant.sessionId?.(operatorId) ?? null, messages: await this.store.chatMessages(operatorId, CHAT_HISTORY_LIMIT) };
  }

  private chatLine(operatorId: string, role: ChatMessage['role'], author: Actor, text: string): ChatMessage {
    return { id: newId(), operatorId, role, authorId: author.id, authorName: author.name, text, at: this.clock.now().toISOString() };
  }

  // ── dashboards ────────────────────────────────────────────────────────────

  async activity(limit: number): Promise<(CaseEvent & { name: string })[]> {
    const [{ snapshot }, events] = await Promise.all([this.current(), this.store.recentActivity(limit)]);
    const names = new Map(snapshot.accounts.map((a) => [a.id, a.name]));
    return events.map((e) => ({ ...e, name: names.get(e.operatorId) ?? e.operatorId }));
  }

  /** Counts only cases with email work. Done = approved or closed. */
  async leader() {
    const [{ run }, previous] = await Promise.all([this.current(), this.runs.previousRun()]);
    const thisRun = run ? (await this.store.casesForRun(run.id)).filter((c) => c.outcome === 'outreach') : [];
    const byOwner = new Map<string | null, OwnerWeekStats>();
    for (const c of thisRun) {
      const row = byOwner.get(c.owner) ?? { owner: c.owner, total: 0, done: 0, approved: 0, closed: 0, rejected: 0, hold: 0, pending: 0, notDrafted: 0 };
      row.total++;
      if (c.state === 'approved') row.approved++;
      else if (c.state === 'closed') row.closed++;
      else if (c.state === 'rejected') row.rejected++;
      else if (c.state === 'hold') row.hold++;
      else {
        row.pending++;
        if (!c.currentDraftId) row.notDrafted++;
      }
      row.done = row.approved + row.closed;
      byOwner.set(c.owner, row);
    }
    const last = new Map<string | null, { owner: string | null; total: number; expired: number }>();
    for (const c of previous ? (await this.store.casesForRun(previous.id)).filter((x) => x.outcome === 'outreach') : []) {
      const row = last.get(c.owner) ?? { owner: c.owner, total: 0, expired: 0 };
      row.total++;
      if (c.state === 'expired') row.expired++;
      last.set(c.owner, row);
    }
    return {
      week: run?.label ?? '—',
      thisWeek: [...byOwner.values()].sort((a, b) => b.total - a.total),
      lastWeek: { week: previous?.label ?? '—', rows: [...last.values()].sort((a, b) => b.total - a.total) },
    };
  }

  async sent() {
    const [jobs, sentCount, settings] = await Promise.all([this.store.listSendJobs(200), this.store.countSent(), this.settings.get()]);
    const cases = new Map<string, CaseRecord>();
    for (const job of jobs) if (!cases.has(job.caseId)) cases.set(job.caseId, (await this.store.getCase(job.caseId))!);
    return { jobs, cases, sentCount, sending: this.sendingInfo(settings) };
  }

  // ── helpers ───────────────────────────────────────────────────────────────

  private async currentCase(operatorId: string): Promise<{ c: CaseRecord; account: CrmAccount; run: RunRecord }> {
    const { run, snapshot } = await this.current();
    const account = snapshot.accounts.find((a) => a.id === operatorId);
    if (!account) throw new AccountNotFoundError(operatorId);
    const c = run ? await this.store.findCase(run.id, operatorId) : undefined;
    if (!run || !c) throw new CaseStateError('This account has no case in the current run');
    return { c, account, run };
  }

  private async editableDraft(operatorId: string) {
    const { c, account } = await this.currentCase(operatorId);
    if (c.outcome !== 'outreach' || !c.currentDraftId) throw new CaseStateError('There is no draft for this account');
    if (c.state === 'closed') throw new CaseStateError('The case is closed');
    const draft = (await this.store.getDraft(c.currentDraftId))!;
    return { c, account, draft };
  }

  private requireTemplate(draft: DraftRecord): void {
    if (draft.writer !== 'template') throw new CaseStateError('This draft was written by the agent or edited by hand; edit it directly instead of re-templating it');
  }

  private render(c: CaseRecord, account: CrmAccount, language: Language, mods: DraftMods) {
    return this.writer.render({ accountName: account.name, health: c.health, playbook: c.playbook, language, mods, variant: mods.variant, features: RECOMMENDED_FEATURES[c.health] });
  }

  private async alreadySent(tx: WorkspaceStore, c: CaseRecord): Promise<boolean> {
    return (await tx.sendJobsForCases([c.id])).some((j) => j.status === 'sent' || j.status === 'sending');
  }

  /** Adds a draft version. A change to an approved case cancels its queued email and voids the approval. */
  private async addDraft(
    tx: WorkspaceStore,
    c: CaseRecord,
    d: { subject: string; body: string; language: Language; writer: DraftWriterKind; mods: DraftMods },
    author: string,
    eventText: string,
  ): Promise<void> {
    if (await this.alreadySent(tx, c)) throw new CaseStateError('This email has already been sent; it can no longer be changed');
    const nowIso = this.clock.now().toISOString();
    const version = (await tx.latestDraftVersion(c.id)) + 1;
    const draft: DraftRecord = {
      id: newId(),
      caseId: c.id,
      version,
      language: d.language,
      subject: d.subject,
      body: d.body,
      draftHash: draftHash(c.caseRef, d.subject, d.body),
      author,
      writer: d.writer,
      mods: d.mods,
      qa: 'not_run',
      createdAt: nowIso,
    };
    await tx.insertDraft(draft);
    c.currentDraftId = draft.id;
    c.language = d.language;
    const event = (kind: CaseEvent['kind'], text: string) => tx.insertEvent(newEvent({ operatorId: c.operatorId, caseId: c.id, kind, origin: 'user', at: nowIso, text }));
    if (c.state === 'approved') {
      await tx.cancelQueuedJobs(c.id);
      c.state = 'pending';
      c.voidNote = APPROVAL_VOIDED;
      await event('bad', 'Approval voided: draft changed');
    } else c.voidNote = null;
    c.updatedAt = nowIso;
    await tx.updateCase(c);
    await event('ai', `${eventText} · v${version}`);
  }

  private async saveDecision(
    tx: WorkspaceStore,
    c: CaseRecord,
    decision: Decision,
    actor: Actor,
    d: { reason?: string; channel?: SendChannel; recipient?: string; draftId?: string },
  ): Promise<void> {
    c.updatedAt = this.clock.now().toISOString();
    await tx.updateCase(c);
    await tx.insertDecision({
      id: newId(),
      caseId: c.id,
      draftId: d.draftId ?? c.currentDraftId,
      decision,
      reason: d.reason ?? null,
      channel: d.channel ?? null,
      recipient: d.recipient ?? null,
      actorId: actor.id,
      actorName: actor.name,
      createdAt: c.updatedAt,
    });
  }
}

function crmEvents(account: CrmAccount): CaseEvent[] {
  const e = (at: string, kind: CaseEvent['kind'], text: string): CaseEvent => ({ id: `crm-${account.id}-${text.length}-${at}`, operatorId: account.id, caseId: null, at, kind, origin: 'crm', text });
  return [
    e(account.createdAt, 'sys', 'Deal created in HubSpot'),
    ...(account.lastNoteAt ? [e(account.lastNoteAt, 'note', 'Last note logged in HubSpot')] : []),
    e(account.modifiedAt, 'sys', 'Deal last modified in HubSpot'),
  ].sort((a, b) => a.at.localeCompare(b.at));
}

/** Exactly what leaves the workspace when an assistant or email model is called. */
export function accountContext(v: AccountDetailView): AccountContext {
  return {
    id: v.account.id,
    name: v.account.name,
    segment: v.account.segment,
    health: v.health,
    playbook: v.playbook.name,
    owner: ownerName(v.account.owner),
    country: v.account.country,
    state: v.state,
    signals: v.signals.map((s) => s.text),
    deals: v.account.deals.map((d) => ({ pipeline: d.pipeline, stage: d.stage, amount: d.amount, closeDate: d.closeDate ?? null })),
    activity: v.events.map((e) => `${e.at} · ${e.text}`),
    ...(v.tmsLink?.status === 'linked' && v.tmsLink.tmsOperatorId != null ? { tmsOperatorId: v.tmsLink.tmsOperatorId } : {}),
  };
}

export { PLAY_OUTBOX };
