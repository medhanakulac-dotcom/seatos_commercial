import { useNavigate } from 'react-router-dom';
import { useAccounts, useActivity, useMe, useMeta, useWao, useZeroTicketIds } from '../../api/queries';
import { Avatar } from '../../components/tags';
import { useUiState } from '../../app/UiState';
import { awaitingReview, byPriority, greeting, ownerKey, ownerName } from '../../lib/format';
import { FeatureUsageCard } from './FeatureUsageCard';
import { PlaybookGuide } from './PlaybookGuide';
import { PlaybookMatrix } from './PlaybookMatrix';

const RUN_AGENT: Record<string, string> = { claude: 'assessed by Claude', hermes: 'assessed by Hermes', local: 'assessed by the built-in playbook' };
export function HomePage() {
  const { data: allAccounts, isPending } = useAccounts();
  const { data: meta } = useMeta();
  const { data: me } = useMe();
  const { data: activity = [] } = useActivity();
  const { data: wao } = useWao();
  const { data: zero } = useZeroTicketIds();
  const { homeSections, setHomeSections, setAccounts, accounts: filters } = useUiState();
  const navigate = useNavigate();

  if (isPending || !allAccounts || !meta) return <div className="loading">Loading…</div>;

  const accounts = filters.owner === 'All' ? allAccounts : allAccounts.filter((a) => ownerKey(a.owner) === filters.owner);
  const waoCount = wao ? accounts.filter((a) => wao.ids.has(a.id)).length : 0;
  const waoPct = accounts.length ? Math.round((100 * waoCount) / accounts.length) : 0;
  const zeroCount = zero ? accounts.filter((a) => zero.has(a.id)).length : 0;
  const rescueCount = accounts.filter((a) => a.playbook === 'Rescue').length;
  const top = [...accounts].sort(byPriority);
  const pending = top.filter(awaitingReview);
  const brief = top.filter((a) => !a.noSend).slice(0, 3);
  const open = (id: string) => navigate(`/accounts/${id}`);
  const review = (id: string) => navigate(`/approvals?case=${encodeURIComponent(id)}`);

  const kpi = (label: string, tag: string, n: number | string, detail: string, cls: string, onClick: () => void) => (
    <div className={`card click ${cls}`} onClick={onClick} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onClick()}>
      <div className="lab" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>{label}</span>
        <span>{tag}</span>
      </div>
      <div className="big">{n}</div>
      <div className="d">
        {detail} <span className="go">view →</span>
      </div>
    </div>
  );
  const toAccounts = (patch: { view: 'all'; pb?: string; tickets?: 'zero' }) => () => {
    setAccounts((f) => ({ ...f, pb: 'All', tickets: 'All', ...patch }));
    navigate('/accounts');
  };

  return (
    <>
      <div className="ph">
        <div>
          <h1>
            {greeting()}, {me?.name.split(' ')[0]}
          </h1>
          <div className="sub">
            Run {meta.week.current}{meta.run ? ` · ${RUN_AGENT[meta.run.agent] ?? `assessed by ${meta.run.agent}`}${meta.run.status === 'running' ? ' (in progress)' : ''}` : ''} · {pending.length} draft{pending.length === 1 ? '' : 's'} waiting for your approval
          </div>
        </div>
      </div>
      <div className="grid g4" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        {kpi('WAO', wao?.week ? `WEEK OF ${wao.week.slice(5)}` : 'NO DATA', wao?.week ? `${waoPct}%` : '—', wao?.week ? `${waoCount} of ${accounts.length} accounts used 3+ of 7 features` : 'no usage data yet', '', toAccounts({ view: 'all' }))}
        {kpi('0 ticket', 'LAST 2 WEEKS', zeroCount, 'accounts with no tickets sold', '', toAccounts({ view: 'all', tickets: 'zero' }))}
        {kpi('Rescue', 'PLAYBOOK', rescueCount, 'accounts on the Rescue playbook', '', toAccounts({ view: 'all', pb: 'Rescue' }))}
      </div>
      <div style={{ marginTop: 18 }}>
        <FeatureUsageCard />
      </div>
      <div className="grid g2" style={{ marginTop: 18, alignItems: 'start' }}>
        <div className="grid" style={{ gap: 18 }}>
          <div className="card">
            <h2 className="st">
              <span>My tasks · review drafts</span>
              <button className="b tlb" onClick={() => navigate('/approvals')}>
                Open Approvals →
              </button>
            </h2>
            {pending.length ? (
              <>
                {pending.slice(0, 8).map((a) => (
                  <div className="task" key={a.id}>
                    <Avatar name={a.name} />
                    <div className="grow">
                      <b>{a.name}</b>
                      <span className="d">
                        {a.playbook} · {meta.languages[a.language]} · owner {ownerName(a.owner)}
                      </span>
                    </div>
                    <button className="b pri" onClick={() => review(a.id)}>
                      Review
                    </button>
                  </div>
                ))}
                {pending.length > 8 && (
                  <div className="d" style={{ padding: '12px 4px' }}>
                    + {pending.length - 8} more in Approvals
                  </div>
                )}
              </>
            ) : (
              <div className="d" style={{ padding: '16px 0' }}>
                All caught up — nothing waiting.
              </div>
            )}
          </div>
          <div className="card">
            <h2 className="st">
              <span>Summary</span>
              <span className="tg llm">rule-based</span>
            </h2>
            {brief.length ? (
              brief.map((a) => (
                <div className="box2" key={a.id} onClick={() => open(a.id)} style={{ cursor: 'pointer' }}>
                  <b>{a.name}</b> — {a.summary}
                </div>
              ))
            ) : (
              <div className="d">No cases in view.</div>
            )}
            <div className="d">Generated by rules from HubSpot fields (segment, health status, stage, last note). No LLM or QA has run on this data yet.</div>
          </div>
        </div>
        <div className="grid" style={{ gap: 18 }}>
          <div className="card">
            <h2 className="st">
              <span>Recent activity</span>
            </h2>
            {activity.length ? (
              activity.map((e) => (
                <div className="task" key={e.id} onClick={() => open(e.accountId)} style={{ cursor: 'pointer' }}>
                  <div className="grow">
                    <b>{e.name}</b>
                    <span className="d">{e.text}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="d">Approvals, holds and notes will show up here.</div>
            )}
          </div>
        </div>
      </div>
      <details className="h" open={homeSections.matrix} onToggle={(e) => setHomeSections((s) => ({ ...s, matrix: (e.target as HTMLDetailsElement).open }))}>
        <summary>
          Playbook matrix <small>segment × product health · hidden</small>
        </summary>
        <PlaybookMatrix accounts={accounts} playbooks={meta.playbooks} />
      </details>
      <details className="h" open={homeSections.guide} onToggle={(e) => setHomeSections((s) => ({ ...s, guide: (e.target as HTMLDetailsElement).open }))}>
        <summary>
          How playbooks are picked <small>two inputs · hidden</small>
        </summary>
        <PlaybookGuide />
      </details>
    </>
  );
}
