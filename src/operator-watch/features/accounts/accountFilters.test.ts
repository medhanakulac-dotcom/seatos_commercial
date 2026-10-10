import type { AccountSummary } from '../../api/types';
import { DEFAULT_ACCOUNTS } from '../../app/UiState';
import { UNASSIGNED } from '../../lib/format';
import { filterAccounts, initialDirection } from './accountFilters';

const base: AccountSummary = {
  id: 'D-1', crmId: '1', name: 'Alpha', caseId: '2026-W40-0001', week: '2026-W40', owner: 'Anong', country: 'Thailand',
  segment: 'High', health: 'Unhealthy', crmHealth: 'Unhealthy', dormant: false, playbook: 'Rescue', playbookDescription: '',
  play: 'Retention', outbox: 'OUT-1', priority: 0, language: 'th', noSend: false, drafted: true, state: 'pending', signalCount: 1, summary: '', author: 'agent:local',
};
const accounts: AccountSummary[] = [
  base,
  { ...base, id: 'D-2', name: 'Bravo', owner: null, segment: 'Low', priority: 20, drafted: false, playbook: 'Automated Activation' },
  { ...base, id: 'D-3', name: 'Charlie', segment: 'Dormant', dormant: true, noSend: true, drafted: false, state: 'reactive', priority: 30 },
  { ...base, id: 'D-4', name: 'Delta', health: 'Healthy', crmHealth: 'Healthy', noSend: true, drafted: false, state: 'healthy', caseId: null, priority: 2 },
];
const names = (list: AccountSummary[]) => list.map((a) => a.name);

describe('filterAccounts', () => {
  it('shows open cases by default, sorted by priority', () => {
    expect(DEFAULT_ACCOUNTS.view).toBe('open');
    expect(names(filterAccounts(accounts, DEFAULT_ACCOUNTS))).toEqual(['Alpha', 'Bravo', 'Charlie']);
    expect(names(filterAccounts(accounts, { ...DEFAULT_ACCOUNTS, view: 'all' }))).toEqual(['Alpha', 'Delta', 'Bravo', 'Charlie']);
  });

  it('has a filter for closed cases', () => {
    const withClosed = [...accounts, { ...base, id: 'D-5', name: 'Echo', state: 'closed' as const, drafted: false, priority: 5 }];
    expect(names(filterAccounts(withClosed, { ...DEFAULT_ACCOUNTS, view: 'closed' }))).toEqual(['Echo']);
    expect(names(filterAccounts(withClosed, DEFAULT_ACCOUNTS))).not.toContain('Echo');
  });

  it('applies the saved views', () => {
    expect(names(filterAccounts(accounts, { ...DEFAULT_ACCOUNTS, view: 'approval' }))).toEqual(['Alpha']);
    expect(names(filterAccounts(accounts, { ...DEFAULT_ACCOUNTS, view: 'reactive' }))).toEqual(['Charlie']);
    expect(names(filterAccounts(accounts, { ...DEFAULT_ACCOUNTS, view: 'healthy' }))).toEqual(['Delta']);
    // Dormant accounts are never "Unhealthy" in the view, even though their CRM health is.
    expect(names(filterAccounts(accounts, { ...DEFAULT_ACCOUNTS, view: 'unhealthy' }))).toEqual(['Alpha', 'Bravo']);
  });

  it('filters unassigned owners and searches case ids', () => {
    expect(names(filterAccounts(accounts, { ...DEFAULT_ACCOUNTS, owner: UNASSIGNED }))).toEqual(['Bravo']);
    expect(names(filterAccounts(accounts, { ...DEFAULT_ACCOUNTS, q: 'w40-0001' }))).toEqual(['Alpha', 'Bravo', 'Charlie']);
  });

  it('only matches languages on accounts that send email', () => {
    expect(names(filterAccounts(accounts, { ...DEFAULT_ACCOUNTS, lang: 'th' }))).toEqual(['Alpha', 'Bravo']);
  });

  it('starts name columns ascending and others descending', () => {
    expect(initialDirection('op')).toBe(1);
    expect(initialDirection('signals')).toBe(-1);
    expect(names(filterAccounts(accounts, { ...DEFAULT_ACCOUNTS, view: 'all', sort: 'op', dir: -1 }))).toEqual(['Delta', 'Charlie', 'Bravo', 'Alpha']);
  });
});
