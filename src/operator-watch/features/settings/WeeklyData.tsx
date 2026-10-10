import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { WeeklySummary, WeeklyUploadResult } from '../../api/types';
import { adminApi } from '../../api/workspace';
import { useToast } from '../../components/Toast';
import { formatEventTime } from '../../lib/format';

const summaryKey = ['admin', 'weekly-data'] as const;
const IGNORE = '__ignore__';

/** Monday (YYYY-MM-DD) of this week in Bangkok: a Sunday-night upload belongs to the week that is ending. */
function thisMonday(): string {
  const local = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  local.setDate(local.getDate() - ((local.getDay() + 6) % 7));
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`;
}

function Slot({ n, title, hint, kind, week, onDone }: { n: number; title: string; hint: string; kind: 'usage' | 'tickets'; week?: string; onDone: (r: WeeklyUploadResult) => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [result, setResult] = useState<WeeklyUploadResult | null>(null);
  const upload = useMutation({
    mutationFn: async (file: File) => adminApi.uploadWeekly(kind, await file.text(), week),
    onSuccess: (r) => {
      setResult(r);
      onDone(r);
      void qc.invalidateQueries({ queryKey: summaryKey });
      toast(`${title}: ${r.rows} rows saved`);
    },
    onError: (e: Error) => toast(e.message),
  });
  return (
    <div className="task" style={{ alignItems: 'flex-start' }}>
      <div className="grow">
        <b>
          {n}. {title}
        </b>
        <div className="d">{hint}</div>
        {result && (
          <div style={{ marginTop: 6 }}>
            <span className="ok">✓ Week of {result.weeks.join(', ')}</span> · {result.rows} operators · {result.matched} matched
            {result.unmatched.length > 0 && <span className="no"> · {result.unmatched.length} to match below</span>}
          </div>
        )}
      </div>
      <label className="b tlb" style={{ cursor: 'pointer' }}>
        {upload.isPending ? 'Uploading…' : result ? 'Replace file' : 'Choose CSV'}
        <input
          type="file"
          accept=".csv,text/csv"
          style={{ display: 'none' }}
          disabled={upload.isPending}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload.mutate(f);
            e.target.value = '';
          }}
        />
      </label>
    </div>
  );
}

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

/** Settings → Weekly data: the two Looker exports uploaded every Sunday night, and name matching. */
export function WeeklyData({ syncTokenSet }: { syncTokenSet: boolean }) {
  const { data } = useQuery({ queryKey: summaryKey, queryFn: adminApi.weeklyData });
  const lastSync = data?.uploads.filter((u) => u.uploadedBy === 'bigquery-sync').sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))[0];
  const [ticketWeek, setTicketWeek] = useState(thisMonday);
  return (
    <div className="card">
      <h2 className="st">
        <span>Weekly data</span>
        <span className="d">upload every Sunday night · read by Claude and the MCP tools</span>
      </h2>
      <div className="task" style={{ alignItems: 'flex-start' }}>
        <div className="grow">
          <b>Automatic sync from BigQuery</b>
          <div className="d">
            A Google Apps Script runs the feature-usage query every day and sends the current and previous week here. It replaces the Activity file below.
          </div>
          <div style={{ marginTop: 6 }}>
            {syncTokenSet ? <span className="ok">✓ sync token set</span> : <span className="no">✗ WEEKLY_INGEST_TOKEN is not set on the server — the sync is off</span>}
            {' · '}
            {lastSync ? (
              <span>
                last sync {formatEventTime(lastSync.uploadedAt)} · week of {lastSync.week} · {lastSync.rows} operators, {lastSync.matched} matched
              </span>
            ) : (
              <span className="d">no sync received yet</span>
            )}
          </div>
        </div>
      </div>
      <Slot n={1} title="Activity (WAO)" hint="Only without the BigQuery sync: Looker → SeatOS H2 WAO Dashboard → Usage Table → Export CSV" kind="usage" onDone={(r) => r.weeks[0] && setTicketWeek(r.weeks[0])} />
      <div className="task">
        <div className="grow">
          <span className="d">Tickets file week (Monday) — set automatically from the activity file</span>
        </div>
        <input type="date" value={ticketWeek} onChange={(e) => setTicketWeek(e.target.value)} />
      </div>
      <Slot n={2} title="Tickets" hint="Looker → Target vs Actual → Budget vs Actual → Export CSV (operator_name and Tickets Actual; GMV is not needed)" kind="tickets" week={ticketWeek} onDone={() => undefined} />
      {data && <Unmatched data={data} />}
      {data?.uploads.length ? (
        <div style={{ marginTop: 14 }}>
          <div className="d" style={{ marginBottom: 4 }}>
            Recent uploads
          </div>
          {data.uploads.slice(0, 8).map((u) => (
            <div className="d" key={`${u.kind}-${u.week}`}>
              Week of {u.week} · {u.kind === 'usage' ? 'Activity' : 'Tickets'} · {u.rows} operators, {u.matched} matched · {u.uploadedBy} · {formatEventTime(u.uploadedAt)}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
