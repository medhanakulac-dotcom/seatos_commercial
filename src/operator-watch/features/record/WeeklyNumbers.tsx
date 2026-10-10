import { useQuery } from '@tanstack/react-query';
import type { Feature } from '../../api/types';
import { workspaceApi } from '../../api/workspace';

const SHORT: Record<Feature, string> = {
  inventory_management: 'Inv',
  distribution_management: 'Dist',
  reservation_management: 'Res',
  trip_management: 'Trip',
  fleet_management: 'Fleet',
  analytics: 'Anl',
  accounting: 'Acc',
};
const FEATURES = Object.keys(SHORT) as Feature[];

/** The weekly Looker uploads for this operator: features used (WAO) and tickets, newest first. */
export function WeeklyNumbers({ accountId }: { accountId: string }) {
  const { data, isPending, error } = useQuery({ queryKey: ['workspace', 'weekly', accountId], queryFn: () => workspaceApi.weekly(accountId), staleTime: 60_000 });
  // The two newest weeks that carry per-feature detail (BigQuery sync): what it uses now and what changed.
  const detailed = (data?.usage ?? []).filter((u) => u.featureUsage?.length).sort((a, b) => b.week.localeCompare(a.week));
  const latest = detailed[0];
  const before = new Set((detailed[1]?.featureUsage ?? []).map((f) => f.name));
  const now = new Set((latest?.featureUsage ?? []).map((f) => f.name));
  const started = detailed[1] ? [...now].filter((n) => !before.has(n)) : [];
  const stopped = detailed[1] ? [...before].filter((n) => !now.has(n)) : [];
  const weeks = data ? [...new Set([...data.usage.map((u) => u.week), ...data.tickets.map((t) => t.week)])].sort().reverse().slice(0, 8) : [];
  return (
    <div className="card">
      <h2 className="st">
        <span>SeatOS weekly</span>
        <span className="d">WAO = features used of 7</span>
      </h2>
      {isPending && <div className="d">Loading…</div>}
      {error && <div className="d">Weekly numbers could not be loaded: {error.message}</div>}
      {data && !weeks.length && <div className="d">No weekly upload matched to this operator yet (Settings → Weekly data).</div>}
      {weeks.length > 0 && (
        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
          <thead>
            <tr className="d" style={{ textAlign: 'left' }}>
              <th>Week</th>
              <th>WAO</th>
              <th>Features</th>
              <th style={{ textAlign: 'right' }}>Tickets</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((w) => {
              const u = data!.usage.find((x) => x.week === w);
              const t = data!.tickets.find((x) => x.week === w);
              return (
                <tr key={w} style={{ borderTop: '1px solid var(--line, #eee)' }}>
                  <td>{w.slice(5)}</td>
                  <td>
                    <b>{u ? `${u.featureCount}/7` : '—'}</b>
                  </td>
                  <td title={u ? FEATURES.filter((f) => u.features[f]).join(', ') : undefined}>{u ? FEATURES.filter((f) => u.features[f]).map((f) => SHORT[f]).join(' ') || 'none' : '—'}</td>
                  <td style={{ textAlign: 'right' }}>{t ? t.tickets.toLocaleString() : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {latest && (
        <div style={{ marginTop: 12 }}>
          <div className="d" style={{ marginBottom: 4 }}>
            Features used, week of {latest.week.slice(5)} <span title="events · days active">(events · days)</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {latest.featureUsage!.map((f) => (
              <span key={f.code} className="tg" title={f.module}>
                {f.name} · {f.events} · {f.days}d
              </span>
            ))}
          </div>
          {(started.length > 0 || stopped.length > 0) && (
            <div className="d" style={{ marginTop: 6 }}>
              {started.length > 0 && <div>New vs last week: {started.join(', ')}</div>}
              {stopped.length > 0 && <div>Stopped since last week: {stopped.join(', ')}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
