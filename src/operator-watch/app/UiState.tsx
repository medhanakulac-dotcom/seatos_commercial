import { createContext, useContext, useMemo, useState } from 'react';

export type AccountsView = 'all' | 'approval' | 'unhealthy' | 'reactive' | 'healthy';
export type SortKey = 'prio' | 'op' | 'owner' | 'segment' | 'health' | 'playbook' | 'signals' | 'state';

export interface AccountsFilters {
  view: AccountsView;
  q: string;
  owner: string;
  seg: string;
  health: string;
  pb: string;
  lang: string;
  sort: SortKey;
  dir: 1 | -1;
  layout: 'table' | 'board';
}

export interface ApprovalsFilters {
  pb: string;
  owner: string;
}

export const DEFAULT_ACCOUNTS: AccountsFilters = { view: 'all', q: '', owner: 'All', seg: 'All', health: 'All', pb: 'All', lang: 'All', sort: 'prio', dir: 1, layout: 'table' };

interface UiState {
  accounts: AccountsFilters;
  setAccounts: React.Dispatch<React.SetStateAction<AccountsFilters>>;
  approvals: ApprovalsFilters;
  setApprovals: React.Dispatch<React.SetStateAction<ApprovalsFilters>>;
  homeSections: { matrix: boolean; guide: boolean };
  setHomeSections: React.Dispatch<React.SetStateAction<{ matrix: boolean; guide: boolean }>>;
}

const Ctx = createContext<UiState | null>(null);

/** View state that survives navigation between pages (filters, sort, layout, open sections). */
export function UiStateProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState<AccountsFilters>(DEFAULT_ACCOUNTS);
  const [approvals, setApprovals] = useState<ApprovalsFilters>({ pb: 'All', owner: 'All' });
  const [homeSections, setHomeSections] = useState({ matrix: false, guide: false });
  const value = useMemo(
    () => ({ accounts, setAccounts, approvals, setApprovals, homeSections, setHomeSections }),
    [accounts, approvals, homeSections],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUiState(): UiState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useUiState must be used inside UiStateProvider');
  return v;
}
