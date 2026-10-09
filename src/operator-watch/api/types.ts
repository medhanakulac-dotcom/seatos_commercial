/** Workspace API contract. Mirrors backend/src/application/workspace/dto/responses. */
export type Segment = 'High' | 'Mid' | 'Low' | 'Dormant';
export type Health = 'Unhealthy' | 'Adopted' | 'Healthy';
export type CrmHealth = 'Unhealthy' | 'Watchlist' | 'Healthy';
export type Language = 'en' | 'th' | 'vi' | 'id';
export type CaseState = 'pending' | 'approved' | 'hold' | 'rejected' | 'closed' | 'reactive' | 'healthy' | 'expired' | 'no_action' | 'no_case';
export type SendChannel = 'smtp' | 'hubspot';
export type SendStatus = 'queued' | 'sending' | 'sent' | 'failed' | 'cancelled';
export type EventKind = 'sys' | 'note' | 'ai' | 'ok' | 'bad' | 'signal';
export type CrmSync = 'synced' | 'pending' | 'failed' | 'local';
export type RewriteMode = 'regen' | 'shorter' | 'warmer' | 'direct';
export type Decision = 'approve' | 'hold' | 'reject' | 'close' | 'reopen';

export interface Playbook {
  name: string;
  description: string;
}

export interface WorkspaceMeta {
  week: { current: string; previous: string };
  source: { kind: 'mock' | 'hubspot'; portal: string; pulledAt: string; description: string; accountCount: number };
  capabilities: { assistant: boolean; emailRewrite: boolean; crmNotes: boolean; drafts: 'template' | 'llm' };
  run: RunInfo | null;
  sending: SendingInfo;
  agent: { mode: AgentMode };
  languages: Record<Language, string>;
  playbooks: {
    matrix: Record<Exclude<Segment, 'Dormant'>, Record<Health, Playbook>>;
    dormant: Playbook;
    healths: Health[];
  };
}

export interface RunInfo {
  id: string;
  label: string;
  status: 'running' | 'completed' | 'failed';
  trigger: 'schedule' | 'manual';
  agent: string;
  startedAt: string;
  completedAt: string | null;
  summary: string | null;
  error: string | null;
}

export interface SendingInfo {
  enabled: boolean;
  channels: { id: SendChannel; label: string }[];
  defaultChannel: SendChannel;
  /** e.g. "Tue 09:00" or "immediately" */
  schedule: string;
  redirected: boolean;
}

export interface AccountSummary {
  id: string;
  crmId: string;
  name: string;
  caseId: string | null;
  week: string;
  owner: string | null;
  country: string | null;
  segment: Segment;
  health: Health;
  crmHealth: CrmHealth;
  dormant: boolean;
  playbook: string;
  playbookDescription: string;
  play: 'Retention' | 'Adoption' | 'Commercial';
  outbox: string;
  priority: number;
  language: Language;
  noSend: boolean;
  drafted: boolean;
  state: CaseState;
  signalCount: number;
  summary: string;
  /** Who assessed it: agent:hermes, agent:local… */
  author: string | null;
}

export interface Signal {
  detector: string;
  code: string;
  text: string;
}

export interface Deal {
  id: string;
  pipeline: string;
  stage: string;
  amount: number | null;
  health: CrmHealth;
  url: string | null;
  closeDate?: string | null;
}

export interface CaseEvent {
  id: string;
  at: string;
  kind: EventKind;
  origin: 'system' | 'crm' | 'user';
  text: string;
  crmSync: CrmSync | null;
  crmError: string | null;
}

export interface Draft {
  subject: string;
  body: string;
  from: string;
  to: string | null;
  version: number;
  hash: string | null;
  mods: { short: boolean; warm: boolean; direct: boolean };
  /** agent = written by Hermes; template = built-in template; human = edited by a person */
  writer: 'agent' | 'template' | 'human';
  author: string;
  qa: 'not_run' | 'pass' | 'fail';
  tokenTtlHours: number;
}

export interface CaseHistoryRow {
  caseId: string;
  week: string;
  playbook: string;
  state: CaseState;
  current: boolean;
}

export interface TmsOperatorCandidate {
  tmsOperatorId: number;
  name: string;
  active: boolean;
  domain: string | null;
}

/** The account's SeatOS/TMS operator link. Optional so the UI tolerates an older backend. */
export interface TmsLink {
  status: 'linked' | 'needs_confirmation' | 'not_found' | 'unresolved';
  tmsOperatorId: number | null;
  tmsOperatorName: string | null;
  source: 'lookup' | 'human' | null;
  candidates: TmsOperatorCandidate[];
  confirmedBy: string | null;
}

export interface AccountDetail extends AccountSummary {
  next: string;
  amount: number | null;
  createdAt: string;
  modifiedAt: string;
  lastNoteAt: string | null;
  /** Close date of the Client Pipeline deal. */
  closeDate: string | null;
  signals: Signal[];
  deals: Deal[];
  events: CaseEvent[];
  cases: CaseHistoryRow[];
  draft: Draft | null;
  contacts: { id: string; name: string; email: string }[];
  sendJobs: SendJob[];
  voidNote: string | null;
  rejectReason: string | null;
  run: { id: string; label: string; status: string } | null;
  tmsLink?: TmsLink;
}

export interface SendJob {
  id: string;
  channel: SendChannel;
  recipient: string;
  deliveredTo: string | null;
  status: SendStatus;
  scheduledFor: string;
  sentAt: string | null;
  attempts: number;
  error: string | null;
  token: string;
  draftHash: string;
}

export interface ActivityItem extends CaseEvent {
  accountId: string;
  name: string;
}

export interface SentRow extends SendJob {
  accountId: string;
  name: string;
  caseId: string;
  playbook: string | null;
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

export interface LeaderStats {
  week: string;
  thisWeek: OwnerWeekStats[];
  lastWeek: { week: string; rows: { owner: string | null; total: number; expired: number }[] };
}

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'analyst' | 'viewer';
  /** What the role grants. Operator-scoped ones (`dashboard:*`) also need access to the operator unless `allOperators`. */
  permissions: string[];
  allOperators: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  authorId: string;
  authorName: string;
  text: string;
  at: string;
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface WorkspaceSettings {
  pipeline: { enabled: boolean; cadence: 'daily' | 'weekly'; weekday: number; time: string; timezone: string };
  agent: { mode: AgentMode; webhookUrl: string; playbookVersion: string; autoDraft: boolean };
  sending: {
    enabled: boolean;
    defaultChannel: SendChannel;
    smtp: { enabled: boolean; fromName: string; fromAddress: string };
    hubspot: { enabled: boolean; emailId: string };
    schedule: { mode: 'immediate' | 'slot'; weekday: number; time: string };
    replyTo: string;
    redirectAllTo: string;
  };
  guards: { blockDormant: boolean; blockHealthy: boolean };
}

/** What the server has configured via env (booleans only — secrets are never sent to the browser). */
/** Who assesses operators in a run. */
export type AgentMode = 'claude' | 'hermes' | 'local';

export interface ServerStatus {
  crmSource: 'mock' | 'hubspot';
  database: boolean;
  hermesWebhookSecret: boolean;
  hermesApi: boolean;
  agentApiToken: boolean;
  /** ANTHROPIC_API_KEY is set: Claude runs, chat, rewrites and memory. */
  claude: boolean;
  /** TMS_TOOLS_MCP_URL is set: the chat can read live SeatOS numbers. */
  seatosTools: boolean;
  smtp: boolean;
  /** Result of the last SMTP connection check (boot or "Verify connection"); null = not checked yet. */
  smtpVerified: boolean | null;
  smtpError: string | null;
  hubspotSending: boolean;
  workers: boolean;
}

export interface AdminRun extends RunInfo {
  periodKey: string;
  playbookVersion: string | null;
  triggeredBy: string | null;
  cases: number;
  outreach: number;
}

/** One note, meeting, call, email, task or logged message from HubSpot. */
export interface CrmActivity {
  id: string;
  type: 'note' | 'meeting' | 'call' | 'email' | 'task' | 'message';
  at: string;
  title: string | null;
  body: string | null;
  detail: string | null;
  owner: string | null;
  url: string | null;
}

export type Feature = 'inventory_management' | 'distribution_management' | 'reservation_management' | 'trip_management' | 'fleet_management' | 'analytics' | 'accounting';

export interface WeeklyUsage {
  week: string;
  operatorName: string;
  accountId: string | null;
  features: Record<Feature, boolean>;
  featureCount: number;
}

export interface WeeklyTickets {
  week: string;
  operatorName: string;
  accountId: string | null;
  gmvUsd: number;
  tickets: number;
}

export interface WeeklyUploadResult {
  kind: 'usage' | 'tickets';
  weeks: string[];
  rows: number;
  matched: number;
  unmatched: { name: string; key: string }[];
}

export interface WeeklySummary {
  uploads: { kind: 'usage' | 'tickets'; week: string; rows: number; matched: number; uploadedAt: string; uploadedBy: string }[];
  unmatched: { name: string; key: string; in: ('usage' | 'tickets')[] }[];
  ignored: string[];
  accounts: { id: string; name: string }[];
}
