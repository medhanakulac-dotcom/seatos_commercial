import { useNavigate } from 'react-router-dom';
import { useAccounts, useZeroTicketIds } from '../../api/queries';
import { DEFAULT_ACCOUNTS, SortKey, useUiState } from '../../app/UiState';
import { OwnerSelect } from '../../components/OwnerSelect';
import { Tour, type TourStep } from '../../components/Tour';
import { Avatar, HealthTag, SegTag, ZeroTicketTag } from '../../components/tags';
import { ownerName } from '../../lib/format';
import { filterAccounts, initialDirection, VIEWS } from './accountFilters';

const SEGMENTS = ['High', 'Mid', 'Low', 'Dormant'];
const HEALTHS = ['Unhealthy', 'Adopted', 'Healthy'];
const ACCOUNTS_TOUR: TourStep[] = [
  {
    target: '[data-tour="views"]',
    title: 'Quick views',
    body: 'All accounts, Unhealthy, Reactive only and Healthy. The number on each tab is how many accounts it holds.',
  },
  {
    target: '[data-tour="filters"]',
    title: 'Search and filters',
    body: 'Search by name, ID or owner, then narrow by owner, segment, health, playbook and tickets. "Zero ticket" shows accounts that sold nothing in the last two weeks. Clear filters resets everything.',
  },
  {
    target: '[data-tour="table"]',
    title: 'The account list',
    body: 'Click a column heading to sort. Signals shows how many signals an account has, with a Zero ticket tag when it sold no tickets. Click a row to open the account.',
  },
  {
    title: 'Inside an account',
    body: 'An account page shows its WAO per week, the features it uses, how its prices compare with other operators on the same route, its HubSpot deals and activity, and a chat that answers questions about the account.',
  },
];

export function AccountsPage() {
  const { data: accounts, isPending } = useAccounts();
  const { data: zero } = useZeroTicketIds();
  const { accounts: f, setAccounts: setF } = useUiState();
  const navigate = useNavigate();

  if (isPending || !accounts) return <div className="loading">Loading…</div>;

  const ctx = { zero };
  const list = filterAccounts(accounts, f, ctx);
  const playbooks = [...new Set(accounts.map((a) => a.playbook))];
  const open = (id: string) => navigate(`/accounts/${id}`);
  const set = (patch: Partial<typeof f>) => setF((prev) => ({ ...prev, ...patch }));
  const sortBy = (key: SortKey) => setF((prev) => (prev.sort === key ? { ...prev, dir: prev.dir === 1 ? -1 : 1 } : { ...prev, sort: key, dir: initialDirection(key) }));

  const th = (key: SortKey, label: string) => (
    <th className="s" onClick={() => sortBy(key)}>
      {label}
      {f.sort === key ? (f.dir > 0 ? ' ▲' : ' ▼') : ''}
    </th>
  );
  const select = (key: 'seg' | 'health' | 'pb', options: [string, string][], label: string) => (
    <select value={f[key]} onChange={(e) => set({ [key]: e.target.value })} aria-label={label}>
      <option value="All">{label}: all</option>
      {options.map(([value, text]) => (
        <option key={value} value={value}>
          {text}
        </option>
      ))}
    </select>
  );
  const table = (
    <div className="tw" data-tour="table">
      <table>
        <thead>
          <tr>
            {th('op', 'Account')}
            {th('owner', 'Owner')}
            {th('segment', 'Segment')}
            {th('health', 'Health')}
            {th('playbook', 'Playbook')}
            {th('signals', 'Signals')}
          </tr>
        </thead>
        <tbody>
          {list.length ? (
            list.map((a) => (
              <tr key={a.id} data-open={a.id} onClick={() => open(a.id)}>
                <td>
                  <div className="acct">
                    <Avatar name={a.name} />
                    <div>
                      <b>{a.name}</b>
                      <span className="d">
                        {a.country ?? '—'}
                      </span>
                    </div>
                  </div>
                </td>
                <td>{ownerName(a.owner)}</td>
                <td>
                  <SegTag segment={a.segment} />
                </td>
                <td>
                  <HealthTag account={a} />
                </td>
                <td>
                  <b>{a.playbook}</b>
                </td>
                <td>
                  {a.signalCount}
                  {zero?.has(a.id) && <ZeroTicketTag style={{ marginLeft: 8 }} />}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="d" style={{ padding: 30, textAlign: 'center' }}>
                No accounts match these filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <div className="ph">
        <div>
          <h1>Accounts</h1>
          <div className="sub">
            {list.length} of {accounts.length} accounts · playbook status is updated every Monday
          </div>
        </div>
        <div className="row">
          <Tour id="accounts" steps={ACCOUNTS_TOUR} ready />
        </div>
      </div>
      <div className="tabs" data-tour="views">
        {VIEWS.map((v) => (
          <button key={v.key} className={f.view === v.key ? 'on' : ''} onClick={() => set({ view: v.key })}>
            {v.label}
            <span className="n">{accounts.filter((a) => v.match(a, ctx)).length}</span>
          </button>
        ))}
      </div>
      <div className="tools" data-tour="filters">
        <input id="accq" placeholder="Search name, ID or owner…" value={f.q} onChange={(e) => set({ q: e.target.value })} aria-label="Search accounts in list" />
        <OwnerSelect all={accounts} list={accounts} value={f.owner} onChange={(owner) => set({ owner })} />
        {select('seg', SEGMENTS.map((s) => [s, s]), 'Segment')}
        {select('health', HEALTHS.map((h) => [h, h]), 'Health')}
        {select('pb', playbooks.map((p) => [p, p]), 'Playbook')}
        <select value={f.tickets} onChange={(e) => set({ tickets: e.target.value as typeof f.tickets })} aria-label="Tickets">
          <option value="All">Tickets: all</option>
          <option value="zero">Zero ticket</option>
          <option value="has">Has tickets</option>
        </select>
        <button className="b sp" onClick={() => setF((prev) => ({ ...DEFAULT_ACCOUNTS, sort: prev.sort, dir: prev.dir }))}>
          Clear filters
        </button>
      </div>
      {table}
    </>
  );
}
