import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { keys, useMe } from '../../api/queries';
import type { ServerStatus, WorkspaceSettings } from '../../api/types';
import { adminApi } from '../../api/workspace';
import { useToast } from '../../components/Toast';
import { formatEventTime } from '../../lib/format';
import { WeeklyData } from './WeeklyData';

const adminKeys = { settings: ['admin', 'settings'] as const, runs: ['admin', 'runs'] as const };

const Check = ({ ok, yes, no }: { ok: boolean; yes: string; no: string }) => <span className={ok ? 'ok' : 'no'}>{ok ? `✓ ${yes}` : `✗ ${no}`}</span>;

function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="fld">
      <label>{label}</label>
      <div>{children}</div>
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center', cursor: 'pointer', fontWeight: 600 }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

/** Admin-only: pipeline cadence, agent, sending channels and guards. */
export function SettingsPage() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const toast = useToast();
  const admin = me?.role === 'admin';
  const settingsQuery = useQuery({ queryKey: adminKeys.settings, queryFn: adminApi.settings, enabled: admin });
  const runsQuery = useQuery({ queryKey: adminKeys.runs, queryFn: adminApi.runs, enabled: admin, refetchInterval: 15_000 });
  const [draft, setDraft] = useState<WorkspaceSettings | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (settingsQuery.data && !draft) setDraft(settingsQuery.data.settings);
  }, [settingsQuery.data, draft]);

  const save = useMutation({
    mutationFn: (s: WorkspaceSettings) => adminApi.saveSettings(s),
    onSuccess: (r) => {
      setError('');
      setDraft(r.settings);
      qc.setQueryData(adminKeys.settings, r);
      void qc.invalidateQueries({ queryKey: keys.meta });
      toast('Settings saved');
    },
    onError: (e) => setError(e.message),
  });
  const runNow = useMutation({
    mutationFn: adminApi.startRun,
    onSuccess: () => {
      toast('Run started');
      void qc.invalidateQueries({ queryKey: adminKeys.runs });
      void qc.invalidateQueries({ queryKey: ['workspace'] });
    },
  });
  if (!admin) return <div className="card d">Settings are only available to admins.</div>;
  if (!draft || !settingsQuery.data) return <div className="loading">Loading…</div>;

  const server: ServerStatus = settingsQuery.data.server;
  const dirty = JSON.stringify(draft) !== JSON.stringify(settingsQuery.data.settings);
  const set = <K extends keyof WorkspaceSettings>(k: K, patch: Partial<WorkspaceSettings[K]>) => setDraft((d) => (d ? { ...d, [k]: { ...d[k], ...patch } } : d));
  const p = draft.pipeline;

  return (
    <div className="settings">
      <div className="ph">
        <div>
          <h1>Settings</h1>
          <div className="sub">Admin only · the Monday update and the weekly numbers.</div>
        </div>
        <div className="row">
          <button className="b" disabled={!dirty || save.isPending} onClick={() => setDraft(settingsQuery.data.settings)}>
            Discard
          </button>
          <button className="b pri" disabled={!dirty || save.isPending} onClick={() => save.mutate(draft)}>
            {save.isPending ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </div>
      {error && <div className="void" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="card">
        <h2 className="st">
          <span>Weekly update</span>
          <span className="d">playbook status of every account, every Monday</span>
        </h2>
        <Field label="Monday update" hint="When off, the update only runs from “Run now” below.">
          <Toggle checked={p.enabled} onChange={(v) => set('pipeline', { enabled: v })} label={p.enabled ? 'On' : 'Off'} />
        </Field>
        <Field label="Time">
          <input type="time" value={p.time} onChange={(e) => set('pipeline', { time: e.target.value })} />
        </Field>
        <Field label="Timezone">
          <input type="text" value={p.timezone} onChange={(e) => set('pipeline', { timezone: e.target.value })} />
        </Field>
      </div>

      <WeeklyData syncTokenSet={server.weeklyIngestToken} />

      <div className="card">
        <h2 className="st">
          <span>Updates</span>
          <button className="b tlb" disabled={runNow.isPending || dirty} title={dirty ? 'Save settings first' : undefined} onClick={() => runNow.mutate()}>
            {runNow.isPending ? 'Starting…' : 'Update now'}
          </button>
        </h2>
        <div className="d" style={{ marginBottom: 8 }}>
          Server: CRM <b>{server.crmSource}</b> · database <Check ok={server.database} yes="Postgres" no="in-memory (data lost on restart)" /> · scheduler{' '}
          <Check ok={server.workers} yes="running" no="off" />
        </div>
        {runsQuery.data?.length ? (
          runsQuery.data.map((r) => (
            <div className="task" key={r.id}>
              <div className="grow">
                <b>
                  {r.label} <span className="d">· {r.trigger}</span>
                </b>
                <span className="d">
                  started {formatEventTime(r.startedAt)} · {r.error ? `${r.error}` : r.summary ?? ''}
                </span>
              </div>
              <span className={`tg st ${r.status === 'completed' ? 'sent' : r.status === 'failed' ? 'failed' : 'queued'}`}>{r.status}</span>
            </div>
          ))
        ) : (
          <div className="d">No updates yet.</div>
        )}
      </div>
    </div>
  );
}
