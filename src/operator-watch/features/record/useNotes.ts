import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateWorkspace, keys } from '../../api/queries';
import type { AccountDetail } from '../../api/types';
import { workspaceApi } from '../../api/workspace';
import { useToast } from '../../components/Toast';

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
