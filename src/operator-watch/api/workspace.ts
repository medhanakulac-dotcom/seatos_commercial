import { http } from './http';
import type {
  AccountDetail,
  AccountSummary,
  ActivityItem,
  ChatMessage,
  CrmActivity,
  FeatureUsage,
  WeeklyPricing,
  WeeklySummary,
  WeeklyTickets,
  WeeklyUsage,
  CurrentUser,
  Decision,
  Language,
  LeaderStats,
  RewriteMode,
  AdminRun,
  SendChannel,
  SendingInfo,
  SentRow,
  ServerStatus,
  WorkspaceMeta,
  WorkspaceSettings,
} from './types';

const account = (id: string) => `/workspace/accounts/${encodeURIComponent(id)}`;

export const authApi = {
  me: () => http.get<CurrentUser>('/auth/me'),
};

export const workspaceApi = {
  meta: () => http.get<WorkspaceMeta>('/workspace/meta'),
  accounts: () => http.get<{ items: AccountSummary[] }>('/workspace/accounts').then((r) => r.items),
  account: (id: string) => http.get<AccountDetail>(account(id)),
  activity: (limit = 6) => http.get<{ items: ActivityItem[] }>(`/workspace/activity?limit=${limit}`).then((r) => r.items),
  sent: () => http.get<{ items: SentRow[]; sentCount: number; sending: SendingInfo }>('/workspace/sent'),
  leader: () => http.get<LeaderStats>('/workspace/leader'),

  generateDraft: (id: string) => http.post<AccountDetail>(`${account(id)}/draft`),
  rewrite: (id: string, mode: RewriteMode) => http.post<AccountDetail>(`${account(id)}/draft/rewrite`, { mode }),
  setLanguage: (id: string, language: Language) => http.post<AccountDetail>(`${account(id)}/draft/language`, { language }),
  rewriteWithPrompt: (id: string, instruction: string) =>
    http.post<{ applied: boolean; message: string; account: AccountDetail }>(`${account(id)}/draft/prompt`, { instruction }),
  decide: (id: string, decision: Decision, extra: { reason?: string; editedBody?: string; channel?: SendChannel; recipient?: string } = {}) =>
    http.post<AccountDetail>(`${account(id)}/decision`, { decision, ...extra }),
  bulkApprove: (playbook: string, owner?: string | null, channel?: SendChannel) =>
    http.post<{ approved: number; skipped: number }>('/workspace/approvals/bulk', { playbook, owner, channel }),
  addNote: (id: string, text: string) => http.post<{ note: AccountDetail['events'][number]; account: AccountDetail }>(`${account(id)}/notes`, { text }),
  retryNote: (id: string, eventId: string) =>
    http.post<{ note: AccountDetail['events'][number]; account: AccountDetail }>(`${account(id)}/notes/${encodeURIComponent(eventId)}/retry`),
  confirmTmsLink: (id: string, tmsOperatorId: number) => http.post<AccountDetail>(`${account(id)}/tms-link`, { tmsOperatorId }),
  resolveTmsLink: (id: string) => http.post<AccountDetail>(`${account(id)}/tms-link/resolve`, {}),
  conversation: (id: string) => http.get<{ sessionId: string | null; messages: ChatMessage[] }>(`${account(id)}/assistant`),
  crmActivity: (id: string) => http.get<{ connected: boolean; items: CrmActivity[] }>(`${account(id)}/hubspot-activity`),
  wao: () => http.get<{ week: string | null; accountIds: string[] }>('/workspace/wao'),
  featureUsage: (feature?: string) => http.get<FeatureUsage>(`/workspace/feature-usage${feature ? `?feature=${encodeURIComponent(feature)}` : ''}`),
  zeroTickets: () => http.get<{ weeks: string[]; accountIds: string[] }>('/workspace/zero-tickets'),
  weekly: (id: string) => http.get<{ usage: WeeklyUsage[]; tickets: WeeklyTickets[]; usageWeeks: string[]; pricing?: WeeklyPricing[]; pricingSyncedAt?: string | null }>(`${account(id)}/weekly`),
  ask: (id: string, question: string) => http.post<{ connected: boolean; messages: ChatMessage[] }>(`${account(id)}/assistant`, { question }),
};

/** Admin-only (role admin). */
export const adminApi = {
  settings: () => http.get<{ settings: WorkspaceSettings; server: ServerStatus }>('/admin/settings'),
  saveSettings: (settings: WorkspaceSettings) => http.put<{ settings: WorkspaceSettings; server: ServerStatus }>('/admin/settings', { settings }),
  runs: () => http.get<{ items: AdminRun[] }>('/admin/runs?limit=20').then((r) => r.items),
  startRun: () => http.post<{ run: AdminRun | null }>('/admin/runs'),
  verifySmtp: () => http.post<{ ok: boolean; error?: string }>('/admin/sending/verify'),
  testEmail: (channel: SendChannel, to: string) => http.post<{ ok: boolean; error?: string }>('/admin/sending/test', { channel, to }),
  weeklyData: () => http.get<WeeklySummary>('/admin/weekly-data'),
  linkWeeklyName: (name: string, accountId: string | null) => http.put<WeeklySummary>('/admin/weekly-data/links', { name, accountId }),
};
