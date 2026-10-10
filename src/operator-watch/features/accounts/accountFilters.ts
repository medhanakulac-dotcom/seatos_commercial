import type { AccountSummary, Health } from '../../api/types';
import type { AccountsFilters, AccountsView, SortKey } from '../../app/UiState';
import { awaitingReview, ownerFromKey } from '../../lib/format';

const HEALTH_RANK: Record<Health, number> = { Unhealthy: 0, Adopted: 1, Healthy: 2 };

/** A case still being worked: waiting for review, approved, on hold, returned, or a reactive-only account. */
const OPEN_STATES: readonly AccountSummary['state'][] = ['pending', 'approved', 'hold', 'rejected', 'reactive'];

export const VIEWS: { key: AccountsView; label: string; match: (a: AccountSummary) => boolean }[] = [
  { key: 'open', label: 'Open cases', match: (a) => OPEN_STATES.includes(a.state) },
  { key: 'closed', label: 'Closed cases', match: (a) => a.state === 'closed' },
  { key: 'all', label: 'All accounts', match: () => true },
  { key: 'approval', label: 'Needs approval', match: awaitingReview },
  { key: 'unhealthy', label: 'Unhealthy', match: (a) => !a.dormant && a.health === 'Unhealthy' },
  { key: 'reactive', label: 'Reactive only', match: (a) => a.dormant },
  { key: 'healthy', label: 'Healthy · no case', match: (a) => a.state === 'healthy' },
];

const SORT_KEYS: Record<SortKey, (a: AccountSummary) => string | number> = {
  prio: (a) => a.priority,
  op: (a) => a.name.toLowerCase(),
  owner: (a) => a.owner ?? '—',
  segment: (a) => a.segment,
  health: (a) => (a.dormant ? -1 : HEALTH_RANK[a.health]),
  playbook: (a) => a.playbook,
  signals: (a) => a.signalCount,
  state: (a) => a.state,
};

/** Sorting a new column starts ascending for names, descending for everything else. */
export const initialDirection = (key: SortKey): 1 | -1 => (key === 'op' || key === 'owner' ? 1 : -1);

export function filterAccounts(accounts: AccountSummary[], f: AccountsFilters): AccountSummary[] {
  const view = VIEWS.find((v) => v.key === f.view) ?? VIEWS[0];
  const q = f.q.trim().toLowerCase();
  const key = SORT_KEYS[f.sort];
  return accounts
    .filter(view.match)
    .filter((a) => !q || `${a.name} ${a.id} ${a.caseId ?? ''} ${a.owner ?? ''}`.toLowerCase().includes(q))
    .filter((a) => f.owner === 'All' || a.owner === ownerFromKey(f.owner))
    .filter((a) => f.seg === 'All' || a.segment === f.seg)
    .filter((a) => f.health === 'All' || (!a.dormant && a.health === f.health))
    .filter((a) => f.pb === 'All' || a.playbook === f.pb)
    .filter((a) => f.lang === 'All' || (!a.noSend && a.language === f.lang))
    .sort((a, b) => {
      const x = key(a);
      const y = key(b);
      return (x > y ? 1 : x < y ? -1 : 0) * f.dir;
    });
}
