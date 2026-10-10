import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from './http';
import type { AccountDetail } from './types';
import { authApi, workspaceApi } from './workspace';

export const keys = {
  me: ['auth', 'me'] as const,
  meta: ['workspace', 'meta'] as const,
  accounts: ['workspace', 'accounts'] as const,
  account: (id: string) => ['workspace', 'account', id] as const,
  activity: ['workspace', 'activity'] as const,
  sent: ['workspace', 'sent'] as const,
  leader: ['workspace', 'leader'] as const,
};

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: true,
        retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2,
      },
    },
  });
}

export const useMe = () => useQuery({ queryKey: keys.me, queryFn: authApi.me, retry: false });
export const useMeta = () => useQuery({ queryKey: keys.meta, queryFn: workspaceApi.meta, refetchInterval: 60_000 });
export const useAccounts = () => useQuery({ queryKey: keys.accounts, queryFn: workspaceApi.accounts });
export const useAccount = (id: string | undefined) =>
  useQuery({ queryKey: keys.account(id ?? ''), queryFn: () => workspaceApi.account(id as string), enabled: !!id });
/** Accounts that were weekly active (WAO) in the latest week with usage data. */
export const useWao = () => useQuery({ queryKey: ['workspace', 'wao'], queryFn: workspaceApi.wao, staleTime: 5 * 60_000, select: (d) => ({ week: d.week, ids: new Set(d.accountIds) }) });
/** Who used a feature over the last four weeks (no feature: just the picker data). */
export const useFeatureUsage = (feature?: string) => useQuery({ queryKey: ['workspace', 'feature-usage', feature ?? ''], queryFn: () => workspaceApi.featureUsage(feature), staleTime: 5 * 60_000 });
/** Ids of the accounts that sold no tickets in the last two weeks of ticket data. */
export const useZeroTicketIds = () =>
  useQuery({ queryKey: ['workspace', 'zero-tickets'], queryFn: workspaceApi.zeroTickets, staleTime: 5 * 60_000, select: (d) => new Set(d.accountIds) });
export const useActivity = () => useQuery({ queryKey: keys.activity, queryFn: () => workspaceApi.activity(6) });
export const useSent = () => useQuery({ queryKey: keys.sent, queryFn: workspaceApi.sent });
export const useLeader = () => useQuery({ queryKey: keys.leader, queryFn: workspaceApi.leader });

/**
 * Wraps a workspace mutation that returns the updated account: writes it into the detail cache
 * and refreshes the lists and counters that depend on case state.
 */
export function useAccountMutation<TVars>(fn: (vars: TVars) => Promise<AccountDetail>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (detail) => {
      qc.setQueryData(keys.account(detail.id), detail);
      void invalidateWorkspace(qc);
    },
  });
}

export function useTmsLink() {
  const confirm = useAccountMutation(({ id, tmsOperatorId }: { id: string; tmsOperatorId: number }) => workspaceApi.confirmTmsLink(id, tmsOperatorId));
  const resolve = useAccountMutation((id: string) => workspaceApi.resolveTmsLink(id));
  return { confirm, resolve };
}

export function invalidateWorkspace(qc: QueryClient) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: keys.accounts }),
    qc.invalidateQueries({ queryKey: keys.activity }),
    qc.invalidateQueries({ queryKey: keys.sent }),
    qc.invalidateQueries({ queryKey: keys.leader }),
  ]);
}
