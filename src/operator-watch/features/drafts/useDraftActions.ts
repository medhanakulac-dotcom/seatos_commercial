import { useMutation, useMutationState, useQueryClient } from '@tanstack/react-query';
import { invalidateWorkspace, keys, useAccountMutation } from '../../api/queries';
import type { AccountDetail, Decision, Language, RewriteMode, SendChannel } from '../../api/types';
import { workspaceApi } from '../../api/workspace';
import { useToast } from '../../components/Toast';
import { ownerName } from '../../lib/format';

const DECISION_TOAST: Record<Decision, string> = {
  approve: 'Approved · queued to send',
  reject: 'Returned to triage',
  hold: 'Put on hold',
  close: 'Case closed · removed from the queue',
  reopen: 'Case reopened · back in the queue',
};

const GENERATE_KEY = ['workspace', 'generate'] as const;

/** Account ids whose draft is being generated right now (for per-row "Generating…" states). */
export function useGeneratingIds(): Set<string> {
  const ids = useMutationState({ filters: { mutationKey: GENERATE_KEY, status: 'pending' }, select: (m) => m.state.variables as string });
  return new Set(ids);
}

export function useGenerateDraft() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationKey: GENERATE_KEY,
    mutationFn: (id: string) => workspaceApi.generateDraft(id),
    onSuccess: (detail) => {
      qc.setQueryData(keys.account(detail.id), detail);
      void invalidateWorkspace(qc);
      toast(`Draft generated · ${detail.name}`);
    },
  });
}

/** Rewrites that change the draft text. Any change voids an existing approval server-side. */
export function useRewriteDraft() {
  const rewrite = useAccountMutation(({ id, mode }: { id: string; mode: RewriteMode }) => workspaceApi.rewrite(id, mode));
  const language = useAccountMutation(({ id, lang }: { id: string; lang: Language }) => workspaceApi.setLanguage(id, lang));
  return {
    rewrite: (id: string, mode: RewriteMode) => rewrite.mutate({ id, mode }),
    setLanguage: (id: string, lang: Language) => language.mutate({ id, lang }),
    busy: rewrite.isPending || language.isPending,
  };
}

export function useDecision() {
  const toast = useToast();
  const m = useAccountMutation(
    ({ id, decision, ...extra }: { id: string; decision: Decision; reason?: string; editedBody?: string; channel?: SendChannel; recipient?: string }) =>
      workspaceApi.decide(id, decision, extra),
  );
  return {
    decide: (id: string, decision: Decision, extra: { reason?: string; editedBody?: string; channel?: SendChannel; recipient?: string } = {}, onDone?: (d: AccountDetail) => void) =>
      m.mutate(
        { id, decision, ...extra },
        {
          onSuccess: (d) => {
            toast(DECISION_TOAST[decision]);
            onDone?.(d);
          },
        },
      ),
    busy: m.isPending,
  };
}

export function useBulkApprove() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ playbook, owner, channel }: { playbook: string; owner?: string | null; channel?: SendChannel }) => workspaceApi.bulkApprove(playbook, owner, channel),
    onSuccess: async (r, { playbook, owner }) => {
      toast(`Approved ${r.approved} ${playbook}${owner !== undefined ? ` · ${ownerName(owner)}` : ''}${r.skipped ? ` · ${r.skipped} skipped (no contact email)` : ''}`);
      await Promise.all([invalidateWorkspace(qc), qc.invalidateQueries({ queryKey: ['workspace', 'account'] })]);
    },
  });
}

export function usePromptRewrite() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, instruction }: { id: string; instruction: string }) => workspaceApi.rewriteWithPrompt(id, instruction),
    onSuccess: (r) => {
      qc.setQueryData(keys.account(r.account.id), r.account);
      if (r.applied) {
        void invalidateWorkspace(qc);
        toast('Draft rewritten');
      }
    },
  });
}

type NoteResult = { note: AccountDetail['events'][number]; account: AccountDetail };

function noteToast(r: NoteResult, retry: boolean): string {
  const sync = r.note.crmSync;
  if (retry) return sync === 'synced' ? 'Sent to HubSpot' : 'Still could not send';
  if (sync === 'synced') return 'Note added · sent to HubSpot';
  if (sync === 'failed') return 'Note added · could not send to HubSpot';
  return 'Note added · not sent (HubSpot not connected)';
}

export function useNotes() {
  const qc = useQueryClient();
  const toast = useToast();
  const onSuccess = (r: NoteResult, retry: boolean) => {
    qc.setQueryData(keys.account(r.account.id), r.account);
    void invalidateWorkspace(qc);
    toast(noteToast(r, retry));
  };
  const add = useMutation({ mutationFn: ({ id, text }: { id: string; text: string }) => workspaceApi.addNote(id, text), onSuccess: (r) => onSuccess(r, false) });
  const retry = useMutation({
    mutationFn: ({ id, eventId }: { id: string; eventId: string }) => workspaceApi.retryNote(id, eventId),
    onSuccess: (r) => onSuccess(r, true),
  });
  return { add, retry };
}
