import { useNavigate } from 'react-router-dom';
import { useEngine } from '../../api/queries';
import type { EngineAgentStatus, EngineOverview } from '../../api/types';
import { formatEventTime } from '../../lib/format';

const STATUS: Record<EngineAgentStatus, { label: string; cls: string }> = {
  live: { label: 'Live', cls: 'live' },
  phase2: { label: 'Phase 2', cls: 'p2' },
  phase3: { label: 'Phase 3', cls: 'p3' },
  needs_data: { label: 'Needs data', cls: 'gap' },
};

const fmt = (n: number) => n.toLocaleString('en-US');
const pct = (n: number, of: number) => (of ? Math.round((100 * n) / of) : 0);

/** Customer Success Engine: what the weekly run read, flagged and left for people, plus the agents behind it. */
export function EnginePage() {
  const { data, isPending, error } = useEngine();
  const navigate = useNavigate();
  if (isPending) return <div className="loading">Loading…</div>;
  if (error || !data) return <div className="card d">Could not load the Engine page{error ? `: ${error.message}` : ''}.</div>;
  const open = (id: string) => navigate(`/accounts/${encodeURIComponent(id)}`);
  const { kpis, wao, run } = data;
  const filteredPct = pct(kpis.filtered, kpis.scanned);
  const decided = kpis.approved + kpis.closed + kpis.rejected;

  return (
    <div className="eng">
      <div className="ph">
        <div>
          <div className="crumb">Operator Watch · Engine</div>
          <h1>Customer Success Engine</h1>
          <div className="sub">1 router · 8 agents · reads BigQuery and HubSpot, drafts the next move, waits for your OK</div>
        </div>
        <RunBadge run={run} />
      </div>

      <section className="grid g4" aria-label="This run">
        <Kpi label="Accounts read" value={fmt(kpis.scanned)} note={run ? `run ${run.label}` : 'no run yet'} />
        <Kpi label="Flagged" value={fmt(kpis.flagged)} note="need a person this week" tone="red" />
        <Kpi label="Decided" value={fmt(decided)} suffix={` / ${fmt(kpis.flagged)}`} note={`${fmt(kpis.pending)} waiting · ${fmt(kpis.sentTotal)} sent all time`} tone="ok" />
        <Kpi label="WAO" value={fmt(wao.active)} suffix={wao.withUsage ? ` / ${fmt(wao.withUsage)}` : ''} note={wao.week ? `week of ${wao.week} · 3+ categories` : 'no usage synced yet'} tone="purple" />
      </section>

      <section className="card eng-router" aria-label="Router and agents">
        <div className="eng-head">
          <b>1 router · 8 agents</b>
          <span className="d">reads every account, wakes an agent only when something needs a person</span>
        </div>
        <div className="eng-flow">
          <div className="eng-col">
            <div className="lab">Sources</div>
            <Source abbr="HS" name="HubSpot CRM" table="deals · health · activity" />
            <Source abbr="BQ" name="BigQuery usage" table="events_flatten → weekly_usage" />
            <Source abbr="DA" name="Daily activity" table="operator_daily" />
            <Source abbr="TK" name="Tickets" table="weekly_tickets" />
          </div>
          <div className="eng-core">
            <span className="eng-q">needs a human?</span>
            <div className="eng-ring" aria-hidden="true">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" /></svg>
            </div>
            <b>Router</b>
            <span className="d">reads the account history and the CS Playbook first</span>
            <span className="eng-filtered">
              {fmt(kpis.filtered)} of {fmt(kpis.scanned)} handled without waking an agent ({filteredPct}%)
            </span>
          </div>
          <div className="eng-col eng-agents">
            <div className="lab">Agents · {data.agents.length}</div>
            <div className="eng-agent-grid">
              {data.agents.map((a) => (
                <div key={a.key} className={`eng-agent ${STATUS[a.status].cls}`}>
                  <div className="eng-agent-top">
                    <span className="eng-agent-name">{a.name}</span>
                    <span className={`eng-st ${STATUS[a.status].cls}`}>{STATUS[a.status].label}</span>
                  </div>
                  <div className="eng-agent-job">{a.job}</div>
                  <div className="eng-agent-data">{a.data}</div>
                  {a.count !== null && (
                    <div className="eng-agent-count">
                      <b>{fmt(a.count)}</b> {a.countLabel}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="eng-row">
        <div className="card eng-queue">
          <h2 className="st">
            Approval queue · {fmt(kpis.pending)}
            <span className="d" style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>
              nothing reaches an operator until you approve it
            </span>
          </h2>
          {data.queue.length === 0 && <div className="d">Nothing waiting. Every flagged account this run has a decision.</div>}
          {data.queue.map((q) => (
            <button key={q.accountId} type="button" className="eng-qrow" onClick={() => open(q.accountId)}>
              <span className="eng-pb">{q.playbook}</span>
              <span className="eng-qmain">
                <b>{q.name}</b>
                <span className="d"> · {q.owner ?? 'No owner'} · {q.drafted ? 'draft ready' : 'not drafted yet'}</span>
                <span className="eng-qwhy">{q.signals[0] ?? q.summary}</span>
              </span>
              <span className="go">Review →</span>
            </button>
          ))}
          {kpis.pending > data.queue.length && <div className="d" style={{ marginTop: 8 }}>+ {fmt(kpis.pending - data.queue.length)} more in Accounts</div>}
        </div>
        <Outcomes kpis={kpis} />
      </section>

      <Milestones m={data.milestones} onOpen={open} />

      <section className="card" aria-label="Event log">
        <h2 className="st">
          Event log
          <span className="d" style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>
            every move is logged
          </span>
        </h2>
        {data.log.length === 0 && <div className="d">No events yet.</div>}
        <div className="eng-log">
          {data.log.map((e) => (
            <button key={e.id} type="button" className="eng-logrow" onClick={() => open(e.accountId)}>
              <span className="eng-logt">{formatEventTime(e.at)}</span>
              <span className={`eng-logk ${e.origin}`}>{e.origin}</span>
              <span className="eng-logm">
                <b>{e.name}</b> — {e.text}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function RunBadge({ run }: { run: EngineOverview['run'] }) {
  if (!run) return <span className="tg">No run yet</span>;
  const ok = run.status === 'completed';
  const when = formatEventTime(run.completedAt ?? run.startedAt);
  return (
    <span className="tg" style={{ whiteSpace: 'normal', ...(ok ? { background: 'var(--okbg)', color: 'var(--ok)' } : run.status === 'failed' ? { background: 'var(--pink)', color: 'var(--red)' } : { background: 'var(--amber-bg)', color: 'var(--amber)' }) }}>
      ● {ok ? 'Last run' : run.status === 'failed' ? 'Run failed' : 'Running'} · {run.label} · {when} · {run.trigger}
    </span>
  );
}

function Kpi({ label, value, suffix, note, tone }: { label: string; value: string; suffix?: string; note: string; tone?: 'red' | 'ok' | 'purple' }) {
  return (
    <div className="card">
      <div className="lab">{label}</div>
      <div className={`big eng-${tone ?? 'ink'}`}>
        {value}
        {suffix && <span className="eng-suffix">{suffix}</span>}
      </div>
      <div className="d">{note}</div>
    </div>
  );
}

function Source({ abbr, name, table }: { abbr: string; name: string; table: string }) {
  return (
    <div className="eng-src">
      <span className={`eng-abbr a-${abbr}`}>{abbr}</span>
      <span style={{ minWidth: 0 }}>
        <b>{name}</b>
        <span className="eng-mono">{table}</span>
      </span>
    </div>
  );
}

function Outcomes({ kpis }: { kpis: EngineOverview['kpis'] }) {
  const rows: [string, number, string][] = [
    ['Approved', kpis.approved, 'var(--ok)'],
    ['Closed by a person', kpis.closed, 'var(--teal)'],
    ['On hold', kpis.hold, 'var(--amber)'],
    ['Rejected', kpis.rejected, 'var(--red)'],
  ];
  return (
    <div className="card eng-outcomes">
      <h2 className="st">This run&apos;s decisions</h2>
      {rows.map(([label, n, color]) => (
        <div key={label} className="eng-orow">
          <span style={{ color, fontWeight: 600 }}>{label}</span>
          <b>{fmt(n)}</b>
        </div>
      ))}
      <div className="d">From the case decisions of the latest run.</div>
    </div>
  );
}

function Milestones({ m, onOpen }: { m: EngineOverview['milestones']; onOpen: (id: string) => void }) {
  const max = Math.max(1, ...m.buckets.map((b) => b.operators));
  const two = m.buckets.find((b) => b.categories === 2)?.operators ?? 0;
  return (
    <section className="card" aria-label="WAO categories">
      <h2 className="st">
        WAO categories · Guide agent
        <span className="d" style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>
          {m.week ? `operators by categories used, week of ${m.week}` : 'no usage synced yet'}
        </span>
      </h2>
      <div className="eng-bars">
        {m.buckets.map((b) => (
          <div key={b.categories} className="eng-bar">
            <span>
              {b.categories} {b.categories === 1 ? 'category' : 'categories'}
            </span>
            <div className="eng-track">
              <div style={{ width: `${(100 * b.operators) / max}%`, background: b.categories >= 3 ? 'var(--teal)' : b.categories === 2 ? 'var(--amber)' : '#cfc3b0' }} />
            </div>
            <b>{fmt(b.operators)}</b>
          </div>
        ))}
      </div>
      {two > 0 && (
        <div className="eng-stuck">
          <span className="eng-stuck-n">{fmt(two)}</span>
          <span>
            operators used exactly 2 categories — one short of WAO. {m.stuckAtTwo.length ? `${fmt(m.stuckAtTwo.length)} of them are matched to an account:` : ''}
          </span>
          <div className="eng-chips">
            {m.stuckAtTwo.slice(0, 24).map((a) => (
              <button key={a.accountId} type="button" className="chip" onClick={() => onOpen(a.accountId)}>
                {a.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
