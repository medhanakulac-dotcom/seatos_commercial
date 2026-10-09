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

/** The weekly Looker uploads for this operator: features used (WAO) and tickets/GMV, newest first. */
export function WeeklyNumbers({ accountId }: { accountId: string }) {
  const { data, isPending, error } = useQuery({ queryKey: ['workspace', 'weekly', accountId], queryFn: () => workspaceApi.weekly(accountId), staleTime: 60_000 });
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
              <th style={{ textAlign: 'right' }}>GMV</th>
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
                  <td style={{ textAlign: 'right' }}>{t ? `$${Math.round(t.gmvUsd).toLocaleString()}` : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
