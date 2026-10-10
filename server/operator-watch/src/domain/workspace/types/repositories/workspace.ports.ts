import {
  Actor,
  CaseEvent,
  CaseRecord,
  ChatMessage,
  CrmAccount,
  CrmActivity,
  CrmSnapshotMeta,
  DecisionRecord,
  DraftMods,
  DraftRecord,
  Health,
  Language,
  OperatorLink,
  RunRecord,
  SendChannel,
  SendJobRecord,
  SnapshotRecord,
  TmsOperatorMatch,
} from '../../entities/workspace.entities';
import { FeatureKey } from '../../services/playbook.rules';
import { WorkspaceSettings } from '../../services/settings';
import { TicketRow, UsageRow, WeeklyKind } from '../../services/weekly-data';

export interface CrmSnapshot {
  readonly meta: CrmSnapshotMeta;
  readonly accounts: readonly CrmAccount[];
}

/** CRM source (HubSpot in production). Returns source-neutral accounts only. */
export interface CrmAccountSource {
  snapshot(): Promise<CrmSnapshot>;
}

/** Pushes notes logged in the workspace to the CRM deal. Nothing else is written to the CRM. */
export interface CrmNoteSync {
  readonly connected: boolean;
  pushNote(input: { dealId: string; note: string; accountId: string; at: string }): Promise<void>;
}

/** Durable workflow state (Postgres in production). All methods are async and may run inside `transaction`. */
export interface WorkspaceStore {
  transaction<T>(fn: (store: WorkspaceStore) => Promise<T>): Promise<T>;

  getSettings(): Promise<Partial<WorkspaceSettings> | undefined>;
  saveSettings(settings: WorkspaceSettings, updatedBy: string): Promise<void>;

  insertSnapshot(snapshot: SnapshotRecord): Promise<void>;
  getSnapshot(id: string): Promise<SnapshotRecord | undefined>;

  /** Returns null when a run for the same period already exists (idempotent scheduling). */
  createRun(run: RunRecord): Promise<RunRecord | null>;
  getRun(id: string): Promise<RunRecord | undefined>;
  runForPeriod(periodKey: string): Promise<RunRecord | undefined>;
  listRuns(limit: number): Promise<RunRecord[]>;
  updateRun(run: RunRecord): Promise<void>;
  /** Atomically reserves the next case number in a run. */
  nextCaseSeq(runId: string): Promise<number>;

  insertCase(c: CaseRecord): Promise<void>;
  updateCase(c: CaseRecord): Promise<void>;
  getCase(id: string): Promise<CaseRecord | undefined>;
  findCase(runId: string, operatorId: string): Promise<CaseRecord | undefined>;
  casesForRun(runId: string): Promise<CaseRecord[]>;
  casesForOperator(operatorId: string): Promise<CaseRecord[]>;
  /** Marks pending/on-hold cases from other runs as expired; returns the affected cases. */
  expireOpenCases(exceptRunId: string, at: string): Promise<CaseRecord[]>;

  insertDraft(d: DraftRecord): Promise<void>;
  getDraft(id: string): Promise<DraftRecord | undefined>;
  latestDraftVersion(caseId: string): Promise<number>;

  insertDecision(d: DecisionRecord): Promise<void>;

  insertEvent(e: CaseEvent): Promise<void>;
  updateEvent(e: CaseEvent): Promise<void>;
  eventsForOperator(operatorId: string): Promise<CaseEvent[]>;
  recentActivity(limit: number): Promise<CaseEvent[]>;

  insertChatMessage(m: ChatMessage): Promise<void>;
  /** Oldest first; `limit` keeps the most recent messages. */
  chatMessages(operatorId: string, limit: number): Promise<ChatMessage[]>;

  insertSendJob(j: SendJobRecord): Promise<void>;
  updateSendJob(j: SendJobRecord): Promise<void>;
  sendJobsForCases(caseIds: string[]): Promise<SendJobRecord[]>;
  listSendJobs(limit: number): Promise<SendJobRecord[]>;
  /** Cancels queued jobs of a case; returns how many were cancelled. */
  cancelQueuedJobs(caseId: string): Promise<number>;
  /** Claims due queued jobs (status → sending, attempts + 1, claimedAt = now) so only one worker sends each. */
  claimDueJobs(now: string, limit: number): Promise<SendJobRecord[]>;
  /**
   * Jobs still `sending` whose claim is older than `claimedBefore` (the worker died mid-send). They are marked
   * `failed` with `error` and returned — never re-queued, because the provider may already have accepted the message.
   */
  failStaleJobs(claimedBefore: string, error: string): Promise<SendJobRecord[]>;
  countSent(): Promise<number>;

  getOperatorLink(accountId: string): Promise<OperatorLink | undefined>;
  /** Insert or replace the link of an account. */
  saveOperatorLink(link: OperatorLink): Promise<void>;
  listOperatorLinks(accountIds?: readonly string[]): Promise<OperatorLink[]>;
}

/**
 * Looks up SeatOS operators by name. Domain vocabulary only; which server or tool serves it is an adapter detail.
 * Without a connection `findOperators` returns [].
 */
export interface TmsDirectory {
  readonly connected: boolean;
  findOperators(name: string): Promise<TmsOperatorMatch[]>;
}
export const TMS_DIRECTORY = Symbol('TMS_DIRECTORY');

export interface DraftRequest {
  readonly accountName: string;
  readonly health: Health;
  readonly playbook: string;
  readonly language: Language;
  readonly mods: DraftMods;
  readonly variant: number;
  readonly features: readonly FeatureKey[];
}

export interface RenderedDraft {
  readonly subject: string;
  readonly body: string;
}

/** Template writer used for local runs and on-demand "Generate" when no agent draft exists. */
export interface DraftWriter {
  readonly kind: 'template' | 'llm';
  render(request: DraftRequest): RenderedDraft;
}

export interface AccountContext {
  readonly id: string;
  readonly name: string;
  readonly segment: string;
  readonly health: Health;
  readonly playbook: string;
  readonly owner: string;
  readonly country: string | null;
  readonly state: string;
  readonly signals: readonly string[];
  readonly deals: readonly { pipeline: string; stage: string; amount: number | null; closeDate?: string | null }[];
  readonly activity: readonly string[];
  /** SeatOS operator id, when the account is linked to one. */
  readonly tmsOperatorId?: number;
}

/** The email AI: writes a case's email on demand (Generate) and rewrites a draft from a free-text instruction. */
export interface EmailRewriter {
  readonly connected: boolean;
  compose(input: { account: AccountContext; language: Language; analysis: string; nextStep: string; playbook: string }): Promise<{ subject: string; body: string }>;
  rewrite(input: { account: AccountContext; language: Language; subject: string; body: string; instruction: string }): Promise<{ subject?: string; body: string }>;
}

export interface ChatTurn {
  readonly role: 'user' | 'assistant';
  readonly text: string;
}

/**
 * The harness-neutral unit sent into an operator's agent session; adapters serialize it. `operatorId` and `kind` are
 * trusted system facts that agent-side memory uses for tagging and must never come from the LLM.
 */
export interface AgentEnvelope {
  readonly operatorId: string;
  readonly kind: 'chat' | 'case' | 'decision' | 'email';
  /** Who is speaking, for `chat`: the session is shared by the whole team. */
  readonly asker?: string;
  /** SeatOS (TMS) operator id when known, so the agent need not look it up by name. */
  readonly tmsOperatorId?: number;
  /** Background facts placed before the speaker's line (e.g. the operator brief), when there are any. */
  readonly context?: string;
  readonly text: string;
}

/** Answers questions about one account. */
export interface AccountAssistant {
  readonly connected: boolean;
  /** Who agent replies are attributed to in the shared chat. */
  readonly author: Actor;
  /** `asker` is the team member speaking: the chat is shared, so the agent must know who is talking. */
  ask(input: { account: AccountContext; question: string; asker: string; history: readonly ChatTurn[] }): Promise<string>;
  /** Id of the agent-side conversation for this operator, when the agent keeps one. */
  sessionId?(operatorId: string): string;
}

/** Something that happened outside the agent's session that its memory of the operator should include. */
export type AgentEvent =
  | {
      readonly type: 'decision';
      readonly operatorId: string;
      readonly caseRef: string;
      readonly decision: 'approve' | 'hold' | 'reject' | 'close' | 'reopen';
      /** Display name of the person who decided. */
      readonly actor: string;
      readonly reason?: string;
      /** Approve only: the agent's draft next to what the human actually approved. */
      readonly edit?: { readonly agentBody: string; readonly finalBody: string };
    }
  | { readonly type: 'email'; readonly operatorId: string; readonly caseRef?: string; readonly outcome: 'sent' | 'failed'; readonly text: string };

/** Tells the agent's operator session about human decisions and email outcomes so its memory stays complete. */
export interface AgentNotifier {
  notify(event: AgentEvent): Promise<void>;
}
export const AGENT_NOTIFIER = Symbol('AGENT_NOTIFIER');

/** What clients watching an operator's chat are told in real time. */
export type ChatEvent =
  | { type: 'message'; message: ChatMessage }
  /** The agent is answering (`asker` = whose question). */
  | { type: 'typing'; operatorId: string; on: boolean; asker?: string }
  /** A colleague is typing in the message box. Never stored; clients expire it on their own. */
  | { type: 'composing'; operatorId: string; userId: string; name: string; on: boolean };

/** Fan-out of chat events to everyone watching an operator (websocket in production). */
export interface ChatEvents {
  publish(operatorId: string, event: ChatEvent): void;
}
export const CHAT_EVENTS = Symbol('CHAT_EVENTS');

export interface RunStartedEvent {
  readonly runId: string;
  readonly label: string;
  readonly snapshotId: string;
  readonly operatorCount: number;
  readonly operators: readonly { readonly id: string; readonly name: string; readonly tmsOperatorId?: number }[];
  readonly trigger: 'schedule' | 'manual';
}

/** Returned by triggers that do the work themselves: settles with a summary once every operator was dispatched. */
export interface AgentDispatch {
  readonly finished: Promise<string>;
}

/** Hands a freshly opened run to the agent that will assess operators and submit cases. */
export interface AgentTrigger {
  trigger(event: RunStartedEvent, settings: WorkspaceSettings): Promise<AgentDispatch | void>;
}

/** One swappable agent integration (e.g. Hermes): everything the workspace needs from the agent side. */
export interface AgentHarness {
  readonly id: string;
  /** Author of agent-submitted cases and chat replies. */
  readonly author: Actor;
  readonly assistant: AccountAssistant;
  readonly trigger: AgentTrigger;
  readonly notifier: AgentNotifier;
  readonly rewriter: EmailRewriter;
}
export const AGENT_HARNESS = Symbol('AGENT_HARNESS');

export interface OutgoingEmail {
  readonly jobId: string;
  readonly to: string;
  readonly subject: string;
  readonly body: string;
  readonly originalRecipient: string;
  /** Where customer replies should go; the From address stays the shared one. */
  readonly replyTo?: string | null;
}

export interface EmailReceipt {
  readonly providerMessageId: string | null;
  /** The provider's acceptance line, kept for the audit trail. */
  readonly response?: string | null;
}

/**
 * A send failure a sender could classify. `permanent` means retrying the same message cannot succeed
 * (rejected recipient, malformed message); anything else — including plain Errors — is retried with backoff.
 */
export class EmailSendError extends Error {
  constructor(
    message: string,
    readonly permanent: boolean,
    readonly code?: string | number,
  ) {
    super(message);
    this.name = 'EmailSendError';
  }
}

export interface EmailSender {
  readonly channel: SendChannel;
  /** Whether the server-side credentials for this channel are present. */
  readonly configured: boolean;
  send(email: OutgoingEmail, settings: WorkspaceSettings): Promise<EmailReceipt>;
  /** Optional live connectivity check (SMTP: connect + auth, no mail sent). */
  verify?(): Promise<{ ok: boolean; error?: string }>;
  /** Outcome of the most recent verify(), if the channel supports it. */
  readonly lastVerification?: { ok: boolean; error?: string; at: string } | null;
}

export interface Clock {
  now(): Date;
}

export const CRM_ACCOUNT_SOURCE = Symbol('CRM_ACCOUNT_SOURCE');
export const CRM_NOTE_SYNC = Symbol('CRM_NOTE_SYNC');
export const WORKSPACE_STORE = Symbol('WORKSPACE_STORE');
export const DRAFT_WRITER = Symbol('DRAFT_WRITER');
export const EMAIL_REWRITER = Symbol('EMAIL_REWRITER');
export const ACCOUNT_ASSISTANT = Symbol('ACCOUNT_ASSISTANT');
export const AGENT_TRIGGER = Symbol('AGENT_TRIGGER');
export const EMAIL_SENDERS = Symbol('EMAIL_SENDERS');
export const WORKSPACE_CLOCK = Symbol('WORKSPACE_CLOCK');


/** Notes, meetings, calls, emails, tasks and logged messages for one account, read live from the CRM. */
export interface CrmActivitySource {
  readonly connected: boolean;
  /** Newest first, at most `limit`. */
  activity(account: CrmAccount, limit: number): Promise<CrmActivity[]>;
}
export const CRM_ACTIVITY = Symbol('CRM_ACTIVITY');

/** One thing the agent remembers. `operatorId` null = a team-wide lesson that applies to every operator. */
export interface MemoryFact {
  readonly id: string;
  readonly operatorId: string | null;
  readonly kind: 'chat' | 'case' | 'decision' | 'email';
  readonly text: string;
  readonly topics: readonly string[];
  readonly source: string | null;
  readonly createdAt: string;
}

export type NewMemoryFact = Omit<MemoryFact, 'id' | 'createdAt'>;

/** The agent's long-term memory. Only current facts (not superseded) are ever recalled. */
export interface AgentMemoryStore {
  /** Current facts about one operator, newest first. */
  forOperator(operatorId: string, limit: number): Promise<MemoryFact[]>;
  /** Team-wide lessons, best match for `query` first (newest first when the query is empty). */
  team(query: string, limit: number): Promise<MemoryFact[]>;
  /** Adds facts and retires the ones they replace, in one transaction. */
  remember(facts: readonly NewMemoryFact[], supersedes: readonly string[]): Promise<MemoryFact[]>;
}
export const AGENT_MEMORY_STORE = Symbol('AGENT_MEMORY_STORE');

/** One operator to assess in a run. */
export interface AgentJob {
  readonly id: string;
  readonly runId: string;
  readonly operatorId: string;
  readonly operatorName: string;
  readonly tmsOperatorId: number | null;
  readonly status: 'pending' | 'working' | 'done' | 'failed';
  readonly attempts: number;
  readonly error: string | null;
}

/** Work queue for run assessments, drained a few jobs at a time by the scheduler tick. */
export interface AgentJobQueue {
  enqueue(runId: string, operators: readonly { id: string; name: string; tmsOperatorId?: number }[]): Promise<void>;
  /** Takes up to `limit` jobs that are pending, or working with an expired lease, and leases them until `leaseUntil`. */
  claim(limit: number, now: string, leaseUntil: string, maxAttempts: number): Promise<AgentJob[]>;
  finish(id: string, outcome: { ok: true } | { ok: false; error: string; retry: boolean }): Promise<void>;
  /** Job counts for a run. */
  progress(runId: string): Promise<{ pending: number; working: number; done: number; failed: number }>;
  /** Runs that got jobs since `since`, so the worker can close the ones that are finished. */
  recentRuns(since: string): Promise<string[]>;
}
export const AGENT_JOB_QUEUE = Symbol('AGENT_JOB_QUEUE');

/** A stored weekly usage row (one operator, one week), with the account it was matched to. */
export interface WeeklyUsageRecord extends UsageRow {
  readonly week: string;
  readonly nameKey: string;
  readonly accountId: string | null;
}

/** A stored weekly tickets/GMV row. */
export interface WeeklyTicketRecord extends TicketRow {
  readonly week: string;
  readonly nameKey: string;
  readonly accountId: string | null;
}

/** One route + vehicle type + vehicle class where an operator's average ticket price was compared with the other operators'. */
export interface PricingSegment {
  readonly from: string;
  readonly to: string;
  readonly vehicleType: string;
  readonly vehicleClass: string;
  readonly tickets: number;
  readonly avgPrice: number;
  readonly peerAvgPrice: number;
  readonly peers: number;
  /** avgPrice vs the peers' average, in percent (+ = more expensive). */
  readonly pct: number;
}

/** How one operator's selling price compares with other operators on the same routes (one currency), from the BigQuery sync. */
export interface PricingRecord {
  readonly operatorName: string;
  readonly nameKey: string;
  readonly accountId: string | null;
  readonly operatorId: number;
  readonly currency: string;
  readonly ticketsCompared: number;
  readonly segments: number;
  /** Ticket-weighted price difference vs peers over all compared segments, in percent (+ = more expensive). */
  readonly pricePct: number;
  readonly windowDays: number;
  /** The segments that differ most, biggest first. */
  readonly detail: readonly PricingSegment[];
  readonly computedAt: string;
}

export interface WeeklyUpload {
  readonly kind: WeeklyKind;
  readonly week: string;
  readonly rows: number;
  readonly matched: number;
  readonly uploadedAt: string;
  readonly uploadedBy: string;
}

/** The weekly numbers the team uploads (Looker CSV exports). Uploading a week replaces that week for that kind. */
export interface WeeklyDataStore {
  replaceUsage(week: string, rows: readonly WeeklyUsageRecord[], by: string): Promise<void>;
  replaceTickets(week: string, rows: readonly WeeklyTicketRecord[], by: string): Promise<void>;
  /** Newest week first. */
  usageFor(accountId: string, limit: number): Promise<WeeklyUsageRecord[]>;
  ticketsFor(accountId: string, limit: number): Promise<WeeklyTicketRecord[]>;
  /** The weeks that have usage data for anyone, newest first: an operator without a row in one of them had no tracked activity. */
  usageWeeks(limit: number): Promise<string[]>;
  /** All rows of one week (the latest uploaded week when omitted). */
  usageWeek(week?: string): Promise<WeeklyUsageRecord[]>;
  ticketsWeek(week?: string): Promise<WeeklyTicketRecord[]>;
  /** One entry per uploaded (kind, week), newest first. */
  uploads(limit: number): Promise<WeeklyUpload[]>;
  /** Hand-made matches: name key → account id (null = ignore this name). */
  nameLinks(): Promise<Map<string, string | null>>;
  /** Saves a hand-made match and applies it to every stored row with that name. */
  setNameLink(nameKey: string, accountId: string | null, by: string): Promise<void>;
  /** The price comparison is one snapshot: a sync replaces all of it. */
  replacePricing(rows: readonly PricingRecord[], by: string): Promise<void>;
  pricingFor(accountId: string): Promise<PricingRecord[]>;
  /** When the last price comparison was synced (null = never): without it, "no price line" means "not synced yet", with it, "nobody comparable". */
  pricingSyncedAt(): Promise<string | null>;
}
export const WEEKLY_DATA_STORE = Symbol('WEEKLY_DATA_STORE');
