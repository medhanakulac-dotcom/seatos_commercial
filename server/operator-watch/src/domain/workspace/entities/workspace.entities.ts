export const SEGMENTS = ['High', 'Mid', 'Low', 'Dormant'] as const;
export type Segment = (typeof SEGMENTS)[number];
export type ActiveSegment = Exclude<Segment, 'Dormant'>;

export const HEALTHS = ['Unhealthy', 'Adopted', 'Healthy'] as const;
export type Health = (typeof HEALTHS)[number];

/** Raw `health_status` values as HubSpot stores them. */
export type CrmHealth = 'Unhealthy' | 'Watchlist' | 'Healthy';

export const LANGUAGES = ['en', 'th', 'vi', 'id'] as const;
export type Language = (typeof LANGUAGES)[number];

/** Stored case states. */
export const CASE_STATES = ['pending', 'approved', 'hold', 'rejected', 'closed', 'expired', 'no_action', 'reactive'] as const;
export type CaseState = (typeof CASE_STATES)[number];

export type PlayType = 'Retention' | 'Adoption' | 'Commercial';
export type CaseOutcome = 'outreach' | 'no_action';
export type EventKind = 'sys' | 'note' | 'ai' | 'ok' | 'bad' | 'signal';
export type EventOrigin = 'system' | 'crm' | 'user' | 'agent';
export type CrmSyncStatus = 'synced' | 'pending' | 'failed' | 'local';
export type RewriteMode = 'regen' | 'shorter' | 'warmer' | 'direct';
export type DraftWriterKind = 'agent' | 'template' | 'human';
export const SEND_CHANNELS = ['smtp', 'hubspot'] as const;
export type SendChannel = (typeof SEND_CHANNELS)[number];
export type SendStatus = 'queued' | 'sending' | 'sent' | 'failed' | 'cancelled';

export interface CrmDeal {
  readonly id: string;
  readonly pipeline: string;
  readonly stage: string;
  readonly amount: number | null;
  readonly health: CrmHealth;
  readonly url: string | null;
  /** HubSpot close date (YYYY-MM-DD), when set. */
  readonly closeDate?: string | null;
}

export interface CrmContact {
  readonly id: string;
  readonly name: string;
  readonly email: string;
}

/** Source-neutral account (operator) record as delivered by a CRM adapter. */
export interface CrmAccount {
  readonly id: string;
  readonly crmId: string;
  readonly name: string;
  readonly segment: Segment;
  readonly crmHealth: CrmHealth;
  readonly country: string | null;
  readonly owner: string | null;
  readonly amount: number | null;
  readonly createdAt: string;
  readonly modifiedAt: string;
  readonly lastNoteAt: string | null;
  /** Close date (YYYY-MM-DD) of the main Client Pipeline deal, when set in HubSpot. */
  readonly closeDate?: string | null;
  readonly deals: readonly CrmDeal[];
  /** Contacts associated with the main deal; the first one is the default recipient. */
  readonly contacts?: readonly CrmContact[];
}

export interface CrmSnapshotMeta {
  readonly kind: 'mock' | 'hubspot';
  readonly portal: string;
  readonly pulledAt: string;
  readonly description: string;
}

/** Immutable CRM pull; every run reasons over exactly one. */
export interface SnapshotRecord {
  readonly id: string;
  readonly meta: CrmSnapshotMeta;
  readonly pulledAt: string;
  readonly contentHash: string;
  readonly accounts: readonly CrmAccount[];
}

export type RunStatus = 'running' | 'completed' | 'failed';

export interface RunRecord {
  readonly id: string;
  readonly periodKey: string;
  readonly label: string;
  readonly trigger: 'schedule' | 'manual';
  status: RunStatus;
  readonly agent: string;
  playbookVersion: string | null;
  readonly snapshotId: string;
  summary: string | null;
  error: string | null;
  readonly triggeredBy: string | null;
  readonly startedAt: string;
  completedAt: string | null;
}

export interface Signal {
  readonly detector: string;
  readonly code: string;
  readonly text: string;
}

/** One operator's work within one run. The agent submits it; people decide on it. */
export interface CaseRecord {
  readonly id: string;
  readonly runId: string;
  readonly caseRef: string;
  readonly operatorId: string;
  operatorName: string;
  owner: string | null;
  segment: Segment;
  health: Health;
  crmHealth: CrmHealth;
  outcome: CaseOutcome;
  state: CaseState;
  playbook: string;
  playType: PlayType;
  signals: Signal[];
  analysis: string;
  nextStep: string;
  language: Language;
  author: string;
  playbookVersion: string | null;
  currentDraftId: string | null;
  rejectReason: string | null;
  voidNote: string | null;
  readonly createdAt: string;
  updatedAt: string;
}

export interface DraftMods {
  short: boolean;
  warm: boolean;
  direct: boolean;
  variant: number;
}

export interface DraftRecord {
  readonly id: string;
  readonly caseId: string;
  readonly version: number;
  readonly language: Language;
  readonly subject: string;
  readonly body: string;
  readonly draftHash: string;
  readonly author: string;
  readonly writer: DraftWriterKind;
  readonly mods: DraftMods;
  readonly qa: 'not_run' | 'pass' | 'fail';
  readonly createdAt: string;
}

export interface DecisionRecord {
  readonly id: string;
  readonly caseId: string;
  readonly draftId: string | null;
  readonly decision: 'approve' | 'hold' | 'reject' | 'close' | 'reopen';
  readonly reason: string | null;
  readonly channel: SendChannel | null;
  readonly recipient: string | null;
  readonly actorId: string;
  readonly actorName: string;
  readonly createdAt: string;
}

export interface CaseEvent {
  readonly id: string;
  readonly operatorId: string;
  readonly caseId: string | null;
  /** ISO timestamp, or an ISO date (YYYY-MM-DD) for CRM facts that only carry a day. */
  readonly at: string;
  readonly kind: EventKind;
  readonly origin: EventOrigin;
  readonly text: string;
  readonly note?: string | null;
  crmSync?: CrmSyncStatus | null;
  crmError?: string | null;
}

/** The exact approved text; the sender never re-renders or calls a model. */
export interface SendJobRecord {
  readonly id: string;
  readonly caseId: string;
  readonly draftId: string;
  readonly draftHash: string;
  readonly channel: SendChannel;
  readonly recipient: string;
  readonly subject: string;
  readonly body: string;
  readonly token: string;
  status: SendStatus;
  scheduledFor: string;
  attempts: number;
  deliveredTo: string | null;
  providerMessageId: string | null;
  /** The provider's acceptance line (e.g. the SMTP "250 2.0.0 OK" reply). "Sent" means accepted by the provider, not inbox delivery. */
  providerResponse: string | null;
  /** When a worker claimed the job; a job stuck in `sending` past the lease is treated as delivery-uncertain. */
  claimedAt: string | null;
  error: string | null;
  sentAt: string | null;
  readonly createdAt: string;
}

export interface Actor {
  readonly id: string;
  readonly name: string;
}

/** One line of the shared per-operator chat. `role: 'assistant'` is the agent; users carry who asked. */
export interface ChatMessage {
  readonly id: string;
  readonly operatorId: string;
  readonly role: 'user' | 'assistant';
  readonly authorId: string;
  readonly authorName: string;
  readonly text: string;
  readonly at: string;
}

export const OPERATOR_LINK_STATUSES = ['linked', 'needs_confirmation', 'not_found'] as const;
export type OperatorLinkStatus = (typeof OPERATOR_LINK_STATUSES)[number];

/** A SeatOS (TMS) operator that could match an account, as found by the directory. */
export interface TmsOperatorMatch {
  readonly tmsOperatorId: number;
  readonly name: string;
  readonly active: boolean;
  readonly domain: string | null;
}

/** Which SeatOS operator a workspace account is, resolved once so agents never look it up by name. */
export interface OperatorLink {
  readonly accountId: string;
  readonly status: OperatorLinkStatus;
  readonly tmsOperatorId: number | null;
  readonly tmsOperatorName: string | null;
  readonly source: 'lookup' | 'human' | null;
  readonly candidates: readonly TmsOperatorMatch[];
  readonly resolvedAt: string;
  readonly confirmedBy: string | null;
}
