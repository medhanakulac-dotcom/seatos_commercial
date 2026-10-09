import { CaseEvent, CaseRecord, OperatorLink, SendJobRecord } from '../../../../domain/workspace/entities/workspace.entities';
import { PLAY_OUTBOX } from '../../../../domain/workspace/services/playbook.rules';
import { AccountDetailView, AccountView } from '../../../../domain/workspace/services/workspace.service';
import { ownerName } from '../../../../domain/workspace/services/workspace.shared';

/** Lightweight row used by lists, boards, queues and counters. */
export function toAccountSummary(v: AccountView) {
  const a = v.account;
  return {
    id: a.id,
    crmId: a.crmId,
    name: a.name,
    caseId: v.case?.caseRef ?? null,
    week: v.run?.label ?? '—',
    owner: a.owner,
    country: a.country,
    segment: a.segment,
    health: v.health,
    crmHealth: a.crmHealth,
    dormant: v.dormant,
    playbook: v.playbook.name,
    playbookDescription: v.playbook.description,
    play: v.case?.playType ?? 'Retention',
    outbox: PLAY_OUTBOX[v.case?.playType ?? 'Retention'],
    priority: v.priority,
    language: v.language,
    noSend: v.noSend,
    drafted: v.drafted,
    state: v.state,
    signalCount: v.signals.length,
    summary: v.summary,
    author: v.case?.author ?? null,
  };
}

export type AccountSummaryResponse = ReturnType<typeof toAccountSummary>;

export function toEvent(e: CaseEvent) {
  return { id: e.id, at: e.at, kind: e.kind, origin: e.origin, text: e.text, crmSync: e.note ? (e.crmSync ?? 'local') : null, crmError: e.crmError ?? null };
}

export function toSendJob(j: SendJobRecord) {
  return {
    id: j.id,
    channel: j.channel,
    recipient: j.recipient,
    deliveredTo: j.deliveredTo,
    status: j.status,
    scheduledFor: j.scheduledFor,
    sentAt: j.sentAt,
    attempts: j.attempts,
    error: j.error,
    token: `tok_${j.token}`,
    draftHash: j.draftHash,
  };
}

/** SeatOS operator link of an account; `unresolved` when nothing has been looked up yet. */
export function toTmsLink(l: OperatorLink | undefined) {
  return {
    status: l?.status ?? ('unresolved' as const),
    tmsOperatorId: l?.tmsOperatorId ?? null,
    tmsOperatorName: l?.tmsOperatorName ?? null,
    source: l?.source ?? null,
    candidates: (l?.candidates ?? []).map((c) => ({ tmsOperatorId: c.tmsOperatorId, name: c.name, active: c.active, domain: c.domain })),
    confirmedBy: l?.confirmedBy ?? null,
  };
}

/** Full record: CRM facts, analysis, timeline, case history, the current draft and its send jobs. */
export function toAccountDetail(v: AccountDetailView) {
  const d = v.draft;
  return {
    ...toAccountSummary(v),
    next: v.nextStep,
    amount: v.account.amount,
    createdAt: v.account.createdAt,
    modifiedAt: v.account.modifiedAt,
    lastNoteAt: v.account.lastNoteAt,
    signals: v.signals,
    deals: v.account.deals,
    contacts: v.account.contacts ?? [],
    events: v.events.map(toEvent),
    cases: v.history.map((c: CaseRecord) => ({
      caseId: c.caseRef,
      week: v.runLabels.get(c.runId) ?? '—',
      playbook: c.playbook,
      state: c.outcome === 'no_action' && c.health === 'Healthy' ? 'healthy' : c.state,
      current: c.runId === v.run?.id,
    })),
    draft: d
      ? {
          subject: d.subject,
          body: d.body,
          from: `${ownerName(v.account.owner)}'s mailbox`,
          to: v.account.contacts?.[0]?.email ?? null,
          version: d.version,
          hash: d.draftHash,
          mods: { short: d.mods.short, warm: d.mods.warm, direct: d.mods.direct },
          writer: d.writer,
          author: d.author,
          qa: d.qa,
          tokenTtlHours: 72,
        }
      : null,
    sendJobs: v.sendJobs.map(toSendJob),
    tmsLink: toTmsLink(v.tmsLink),
    voidNote: v.case?.voidNote ?? null,
    rejectReason: v.case?.rejectReason ?? null,
    run: v.run ? { id: v.run.id, label: v.run.label, status: v.run.status } : null,
  };
}

export type AccountDetailResponse = ReturnType<typeof toAccountDetail>;
