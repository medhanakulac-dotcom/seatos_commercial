import { createContext, useContext, useMemo, useState } from 'react';

export type AccountsView = 'all' | 'unhealthy' | 'reactive' | 'healthy';
export type SortKey = 'prio' | 'op' | 'owner' | 'segment' | 'health' | 'playbook' | 'signals';

export interface AccountsFilters {
  view: AccountsView;
  q: string;
  owner: string;
  seg: string;
  health: string;
  pb: string;
  /** Tickets filter: every account, only those with no tickets in the last two weeks, or only those that sold some. */
  tickets: 'All' | 'zero' | 'has';
  sort: SortKey;
  dir: 1 | -1;
}

export const DEFAULT_ACCOUNTS: AccountsFilters = { view: 'all', q: '', owner: 'All', seg: 'All', health: 'All', pb: 'All', tickets: 'All', sort: 'prio', dir: 1 };

interface UiState {
  accounts: AccountsFilters;
  setAccounts: React.Dispatch<React.SetStateAction<AccountsFilters>>;
  homeSections: { matrix: boolean; guide: boolean };
  setHomeSections: React.Dispatch<React.SetStateAction<{ matrix: boolean; guide: boolean }>>;
}

const Ctx = createContext<UiState | null>(null);

/** View state that survives navigation between pages (filters, sort, open sections). */
export function UiStateProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState<AccountsFilters>(DEFAULT_ACCOUNTS);
  const [homeSections, setHomeSections] = useState({ matrix: false, guide: false });
  const value = useMemo(
    () => ({ accounts, setAccounts, homeSections, setHomeSections }),
    [accounts, homeSections],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUiState(): UiState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useUiState must be used inside UiStateProvider');
  return v;
}
