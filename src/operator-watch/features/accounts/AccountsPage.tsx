import { useNavigate } from 'react-router-dom';
import { useAccounts, useMeta, useZeroTicketIds } from '../../api/queries';
import type { AccountSummary, CaseState } from '../../api/types';
import { DEFAULT_ACCOUNTS, SortKey, useUiState } from '../../app/UiState';
import { OwnerSelect } from '../../components/OwnerSelect';
import { Avatar, HealthTag, LangTag, SegTag, StateTag, ZeroTicketTag } from '../../components/tags';
import { ownerName } from '../../lib/format';
import { useGenerateDraft, useGeneratingIds } from '../drafts/useDraftActions';
import { filterAccounts, initialDirection, VIEWS } from './accountFilters';

const SEGMENTS = ['High', 'Mid', 'Low', 'Dormant'];
const HEALTHS = ['Unhealthy', 'Adopted', 'Healthy'];
const BOARD_COLUMNS: [CaseState, string][] = [
  ['pending', 'To review'],
  ['approved', 'Approved'],
  ['hold', 'On hold'],
  ['rejected', 'Returned'],
  ['reactive', 'Reactive only'],
  ['healthy', 'Healthy · no case'],
  ['closed', 'Closed'],
];

export function AccountsPage() {
  const { data: accounts, isPending } = useAccounts();
  const { data: meta } = useMeta();
  const { data: zero } = useZeroTicketIds();
  const { accounts: f, setAccounts: setF } = useUiState();
  const navigate = useNavigate();
  const generate = useGenerateDraft();
  const generating = useGeneratingIds();

  if (isPending || !accounts || !meta) return <div className="loading">Loading…</div>;

  const list = filterAccounts(accounts, f);
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
  const select = (key: 'seg' | 'health' | 'pb' | 'lang', options: [string, string][], label: string) => (
    <select value={f[key]} onChange={(e) => set({ [key]: e.target.value })} aria-label={label}>
      <option value="All">{label}: all</option>
      {options.map(([value, text]) => (
        <option key={value} value={value}>
          {text}
        </option>
      ))}
    </select>
  );
  const generateButton = (a: AccountSummary) => (
    <button
      className="b tlb"
      disabled={generating.has(a.id)}
      onClick={(e) => {
        e.stopPropagation();
        generate.mutate(a.id);
      }}
    >
      {generating.has(a.id) ? 'Generating…' : 'Generate'}
    </button>
  );

  const table = (
    <div className="tw">
      <table>
        <thead>
          <tr>
            {th('op', 'Account')}
            {th('owner', 'Owner')}
            {th('segment', 'Segment')}
            {th('health', 'Health')}
            {th('playbook', 'Playbook')}
            <th>Lang</th>
            <th>Draft</th>
            {th('state', 'Status')}
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
                        {a.caseId ?? 'no case'} · {a.country ?? '—'}
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
                <td>{a.noSend ? '—' : <LangTag language={a.language} title={meta.languages[a.language]} />}</td>
                <td>{a.noSend || a.state === 'closed' ? '—' : a.drafted ? <span className="tg">ready</span> : generateButton(a)}</td>
                <td>
                  <StateTag state={a.state} />
                  {zero?.has(a.id) && <ZeroTicketTag style={{ marginLeft: 6 }} />}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={8} className="d" style={{ padding: 30, textAlign: 'center' }}>
                No accounts match these filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const board = (
    <div className="board">
      {BOARD_COLUMNS.map(([state, label]) => {
        const items = list.filter((a) => a.state === state);
        return (
          <div className="col" key={state}>
            <h3>
              <span>{label}</span>
              <span>{items.length}</span>
            </h3>
            {items.map((a) => (
              <div className="kc" key={a.id} onClick={() => open(a.id)}>
                <div className="l">
                  <b>{a.name}</b>
                </div>
                <div className="d">{a.playbook}</div>
                <div className="m">
                  {zero?.has(a.id) && <ZeroTicketTag />}
                  <SegTag segment={a.segment} />
                  <HealthTag account={a} />
                  {!a.noSend && <LangTag language={a.language} />}
                  <Avatar name={ownerName(a.owner)} size={24} title={ownerName(a.owner)} style={{ marginLeft: 'auto' }} />
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      <div className="ph">
        <div>
          <h1>Accounts</h1>
          <div className="sub">
            {list.length} of {accounts.length} accounts · click a row to open the record
          </div>
        </div>
        <div className="row">
          <button className={`b ${f.layout === 'table' ? 'on' : ''}`} onClick={() => set({ layout: 'table' })}>
            ☰ Table
          </button>
          <button className={`b ${f.layout === 'board' ? 'on' : ''}`} onClick={() => set({ layout: 'board' })}>
            ▦ Board
          </button>
        </div>
      </div>
      <div className="tabs">
        {VIEWS.map((v) => (
          <button key={v.key} className={f.view === v.key ? 'on' : ''} onClick={() => set({ view: v.key })}>
            {v.label}
            <span className="n">{accounts.filter(v.match).length}</span>
          </button>
        ))}
      </div>
      <div className="tools">
        <input id="accq" placeholder="Search name, ID or owner…" value={f.q} onChange={(e) => set({ q: e.target.value })} aria-label="Search accounts in list" />
        <OwnerSelect all={accounts} list={accounts} value={f.owner} onChange={(owner) => set({ owner })} />
        {select('seg', SEGMENTS.map((s) => [s, s]), 'Segment')}
        {select('health', HEALTHS.map((h) => [h, h]), 'Health')}
        {select('pb', playbooks.map((p) => [p, p]), 'Playbook')}
        {select('lang', Object.entries(meta.languages), 'Language')}
        <button className="b sp" onClick={() => setF((prev) => ({ ...DEFAULT_ACCOUNTS, sort: prev.sort, dir: prev.dir, layout: prev.layout }))}>
          Clear filters
        </button>
      </div>
      {f.layout === 'table' ? table : board}
    </>
  );
}
