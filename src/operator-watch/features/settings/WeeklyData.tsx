import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { WeeklySummary } from '../../api/types';
import { adminApi } from '../../api/workspace';
import { useToast } from '../../components/Toast';
import { formatEventTime } from '../../lib/format';

const summaryKey = ['admin', 'weekly-data'] as const;
const IGNORE = '__ignore__';

function Unmatched({ data }: { data: WeeklySummary }) {
  const qc = useQueryClient();
  const toast = useToast();
  const link = useMutation({
    mutationFn: ({ name, accountId }: { name: string; accountId: string | null }) => adminApi.linkWeeklyName(name, accountId),
    onSuccess: (s) => qc.setQueryData(summaryKey, s),
    onError: (e: Error) => toast(e.message),
  });
  if (!data.unmatched.length) return <div className="d" style={{ marginTop: 10 }}>Every name in the latest week is matched to an account.</div>;
  return (
    <div style={{ marginTop: 12 }}>
      <div className="d" style={{ marginBottom: 6 }}>
        These names did not match a HubSpot deal. Pick the account once; it is remembered for every later week.
      </div>
      {data.unmatched.map((u) => (
        <div className="task" key={u.key}>
          <div className="grow">
            <b>{u.name}</b> <span className="d">· in {u.in.join(' and ')}</span>
          </div>
          <select
            defaultValue=""
            disabled={link.isPending}
            onChange={(e) => e.target.value && link.mutate({ name: u.name, accountId: e.target.value === IGNORE ? null : e.target.value })}
            style={{ maxWidth: 260 }}
          >
            <option value="" disabled>
              Match to account…
            </option>
            <option value={IGNORE}>Not an operator we track (ignore)</option>
            {data.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

/** Settings → Weekly data: status of the BigQuery sync (feature usage + tickets), names to match, and the history. */
export function WeeklyData({ syncTokenSet }: { syncTokenSet: boolean }) {
  const { data } = useQuery({ queryKey: summaryKey, queryFn: adminApi.weeklyData });
  const lastSync = data?.uploads.filter((u) => u.uploadedBy === 'bigquery-sync').sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))[0];
  return (
    <div className="card">
      <h2 className="st">
        <span>Weekly data</span>
        <span className="d">updated automatically every morning · read by Claude and the MCP tools</span>
      </h2>
      <div className="task" style={{ alignItems: 'flex-start' }}>
        <div className="grow">
          <b>Automatic daily update</b>
          <div className="d">
            The feature-usage and ticket numbers are refreshed every day for the current and previous week. Nothing needs to be uploaded.
          </div>
          <div style={{ marginTop: 6 }}>
            {syncTokenSet ? <span className="ok">✓ update key set</span> : <span className="no">✗ WEEKLY_INGEST_TOKEN is not set on the server — the daily update is off</span>}
            {' · '}
            {lastSync ? (
              <span>
                last update {formatEventTime(lastSync.uploadedAt)} · week of {lastSync.week} · {lastSync.rows} operators, {lastSync.matched} matched
              </span>
            ) : (
              <span className="d">no update received yet</span>
            )}
          </div>
        </div>
      </div>
      {data && <Unmatched data={data} />}
      {data?.uploads.length ? (
        <div style={{ marginTop: 14 }}>
          <div className="d" style={{ marginBottom: 4 }}>
            Recent updates
          </div>
          {data.uploads.slice(0, 8).map((u) => (
            <div className="d" key={`${u.kind}-${u.week}`}>
              Week of {u.week} · {u.kind === 'usage' ? 'Usage' : 'Tickets'} · {u.rows} operators, {u.matched} matched · {u.uploadedBy} · {formatEventTime(u.uploadedAt)}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
