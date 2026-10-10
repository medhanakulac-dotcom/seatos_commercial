import { useAccounts, useMeta } from '../../api/queries';
import { useUiState } from '../../app/UiState';
import { ownerKey, ownerName, ownersByLoad } from '../../lib/format';
import { GlobalSearch } from './GlobalSearch';

export function Topbar() {
  const { data: accounts = [] } = useAccounts();
  const { data: meta } = useMeta();
  const { accounts: filters, setAccounts } = useUiState();
  const owner = filters.owner;
  const setOwner = (v: string) => {
    setAccounts((f) => ({ ...f, owner: v }));
  };

  return (
    <header className="topbar">
      <GlobalSearch />
      <label className={`ownerf ${owner !== 'All' ? 'on' : ''}`}>
        <span>Owner</span>
        <select value={owner} onChange={(e) => setOwner(e.target.value)} aria-label="Owner">
          <option value="All">All owners ({accounts.length})</option>
          {ownersByLoad(accounts).map((o) => (
            <option key={ownerKey(o)} value={ownerKey(o)}>
              {ownerName(o)} ({accounts.filter((a) => a.owner === o).length})
            </option>
          ))}
        </select>
      </label>
      <span className="week" id="srcbadge">
        {meta && (
          <>
            <span className="tg" style={meta.source.kind === 'hubspot' ? { background: '#e6f6ec', color: '#3f9a5b' } : { background: 'var(--amber-bg)', color: 'var(--amber)' }}>
              ● HubSpot {meta.source.kind === 'hubspot' ? 'live' : 'mock'} data
            </span>{' '}
            &nbsp;Week {meta.week.current} · {meta.source.portal} · pulled {meta.source.pulledAt} · {meta.source.accountCount} accounts
          </>
        )}
      </span>
    </header>
  );
}
