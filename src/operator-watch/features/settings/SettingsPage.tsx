import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { keys, useMe } from '../../api/queries';
import type { AgentMode, SendChannel, ServerStatus, WorkspaceSettings } from '../../api/types';
import { adminApi } from '../../api/workspace';
import { useToast } from '../../components/Toast';
import { formatEventTime } from '../../lib/format';
import { WeeklyData } from './WeeklyData';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
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
  const [test, setTest] = useState<{ channel: SendChannel; to: string; result: string }>({ channel: 'smtp', to: me?.email ?? '', result: '' });

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
  const verifySmtp = useMutation({
    mutationFn: adminApi.verifySmtp,
    onSuccess: () => void qc.invalidateQueries({ queryKey: adminKeys.settings }),
  });
  const sendTest = useMutation({
    mutationFn: () => adminApi.testEmail(test.channel, test.to),
    onSuccess: (r) => setTest((t) => ({ ...t, result: r.ok ? 'Sent — check the inbox (or Mailpit locally).' : `Failed: ${r.error}` })),
  });

  if (!admin) return <div className="card d">Settings are only available to admins.</div>;
  if (!draft || !settingsQuery.data) return <div className="loading">Loading…</div>;

  const server: ServerStatus = settingsQuery.data.server;
  const dirty = JSON.stringify(draft) !== JSON.stringify(settingsQuery.data.settings);
  const set = <K extends keyof WorkspaceSettings>(k: K, patch: Partial<WorkspaceSettings[K]>) => setDraft((d) => (d ? { ...d, [k]: { ...d[k], ...patch } } : d));
  const setSending = (patch: Partial<WorkspaceSettings['sending']>) => set('sending', patch);
  const p = draft.pipeline;
  const a = draft.agent;
  const s = draft.sending;

  return (
    <div className="settings">
      <div className="ph">
        <div>
          <h1>Settings</h1>
          <div className="sub">Admin only · pipeline, agent, sending and guards. Secrets stay on the server and are shown only as configured / not configured.</div>
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
          <span>Pipeline</span>
          <span className="d">when Operator Watch runs</span>
        </h2>
        <Field label="Scheduled runs" hint="When off, runs only start from “Run now” below.">
          <Toggle checked={p.enabled} onChange={(v) => set('pipeline', { enabled: v })} label={p.enabled ? 'On' : 'Off'} />
        </Field>
        <Field label="Cadence">
          <select value={p.cadence} onChange={(e) => set('pipeline', { cadence: e.target.value as 'daily' | 'weekly' })}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </Field>
        {p.cadence === 'weekly' && (
          <Field label="Day">
            <select value={p.weekday} onChange={(e) => set('pipeline', { weekday: Number(e.target.value) })}>
              {WEEKDAYS.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Time" hint="Each new run expires the previous run's cases that are still pending or on hold.">
          <input type="time" value={p.time} onChange={(e) => set('pipeline', { time: e.target.value })} />
        </Field>
        <Field label="Timezone">
          <input type="text" value={p.timezone} onChange={(e) => set('pipeline', { timezone: e.target.value })} />
        </Field>
      </div>

      <div className="card">
        <h2 className="st">
          <span>Agent</span>
          <span className="d">who assesses operators and writes drafts</span>
        </h2>
        <Field label="Mode">
          <select value={a.mode} onChange={(e) => set('agent', { mode: e.target.value as AgentMode })}>
            <option value="claude">Claude (AI, runs on this site)</option>
            <option value="hermes">Hermes (webhook + MCP)</option>
            <option value="local">Built-in rule playbook (no AI)</option>
          </select>
        </Field>
        {a.mode === 'claude' && (
          <Field label="Server" hint="Claude also answers the account chat, rewrites drafts from a prompt and keeps the team's memory whenever it is configured.">
            <span>
              <Check ok={server.claude} yes="Claude connected" no="ANTHROPIC_API_KEY missing — runs will fail" /> ·{' '}
              <Check ok={server.seatosTools} yes="live SeatOS data in chat" no="no SeatOS tools (TMS_TOOLS_MCP_URL)" />
            </span>
          </Field>
        )}
        {a.mode === 'hermes' && (
          <>
            <Field label="Hermes webhook URL" hint="e.g. http://hermes:8644/webhooks/operator-watch — signed with HERMES_WEBHOOK_SECRET.">
              <input type="url" value={a.webhookUrl} placeholder="https://…/webhooks/operator-watch" onChange={(e) => set('agent', { webhookUrl: e.target.value })} />
            </Field>
            <Field label="Server">
              <span>
                <Check ok={server.hermesWebhookSecret} yes="webhook secret set" no="HERMES_WEBHOOK_SECRET missing" /> ·{' '}
                <Check ok={server.agentApiToken} yes="MCP endpoint enabled (/api/mcp)" no="AGENT_API_TOKEN missing — MCP disabled" />
              </span>
            </Field>
          </>
        )}
        <Field label="Email drafts" hint="Off: runs only assess (analysis + next step). Each email is written when someone presses Generate draft on the account — by the AI in Claude mode.">
          <Toggle checked={a.autoDraft} onChange={(v) => set('agent', { autoDraft: v })} label="Write drafts automatically during runs" />
        </Field>
        <Field label="Playbook version" hint="Recorded on every case so you can tell which playbook produced which email.">
          <input type="text" value={a.playbookVersion} placeholder="e.g. operator-watch-v3" onChange={(e) => set('agent', { playbookVersion: e.target.value })} />
        </Field>
      </div>

      <div className="card">
        <h2 className="st">
          <span>Sending</span>
          <span className="d">what happens after approval</span>
        </h2>
        <Field label="Send approved emails" hint="Master switch. While off, approved emails wait in the queue and nothing is sent.">
          <Toggle checked={s.enabled} onChange={(v) => setSending({ enabled: v })} label={s.enabled ? 'On — emails will be sent' : 'Off — paused'} />
        </Field>
        <Field label="Test mode: redirect all to" hint="When set, every email goes to this address instead of the customer. Leave empty to send to real recipients.">
          <input type="email" value={s.redirectAllTo} placeholder="you@seatos.com" onChange={(e) => setSending({ redirectAllTo: e.target.value })} />
        </Field>
        <Field label="When">
          <span className="row">
            <select value={s.schedule.mode} onChange={(e) => setSending({ schedule: { ...s.schedule, mode: e.target.value as 'immediate' | 'slot' } })}>
              <option value="slot">At a send slot</option>
              <option value="immediate">Immediately after approval</option>
            </select>
            {s.schedule.mode === 'slot' && (
              <>
                <select value={s.schedule.weekday} onChange={(e) => setSending({ schedule: { ...s.schedule, weekday: Number(e.target.value) } })} style={{ maxWidth: 160 }}>
                  {WEEKDAYS.map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
                <input type="time" value={s.schedule.time} onChange={(e) => setSending({ schedule: { ...s.schedule, time: e.target.value } })} style={{ maxWidth: 120 }} />
              </>
            )}
          </span>
        </Field>
        <Field
          label="Email server (SMTP)"
          hint={
            <>
              <Check ok={server.smtp} yes="server configured" no="SMTP_HOST not set on the server" />
              {server.smtp && server.smtpVerified !== null && (
                <>
                  {' · '}
                  <Check ok={server.smtpVerified} yes="connection verified" no={`connection failed${server.smtpError ? `: ${server.smtpError}` : ''}`} />
                </>
              )}
              {verifySmtp.data && ` · ${verifySmtp.data.ok ? 'just verified' : `check failed: ${verifySmtp.data.error}`}`}
              {' · one shared From address for every email.'}
            </>
          }
        >
          <span className="row">
            <Toggle checked={s.smtp.enabled} onChange={(v) => setSending({ smtp: { ...s.smtp, enabled: v } })} label="Enabled" />
            <input type="text" value={s.smtp.fromName} placeholder="From name" onChange={(e) => setSending({ smtp: { ...s.smtp, fromName: e.target.value } })} style={{ maxWidth: 200 }} />
            <input type="email" value={s.smtp.fromAddress} placeholder="from@seatos.com" onChange={(e) => setSending({ smtp: { ...s.smtp, fromAddress: e.target.value } })} style={{ maxWidth: 220 }} />
            <button className="b" disabled={!server.smtp || verifySmtp.isPending} title="Connects and signs in to the mail server; sends nothing" onClick={() => verifySmtp.mutate()}>
              {verifySmtp.isPending ? 'Checking…' : 'Verify connection'}
            </button>
          </span>
        </Field>
        <Field label="Reply-To" hint="Customer replies go here instead of the shared From address. Leave empty to have replies go to From. Applies to the email-server channel; HubSpot uses the address set on its transactional email.">
          <input type="email" value={s.replyTo} placeholder="cs-team@seatos.com" onChange={(e) => setSending({ replyTo: e.target.value })} />
        </Field>
        <Field
          label="HubSpot"
          hint={
            <>
              <Check ok={server.hubspotSending} yes="HubSpot token configured" no="HUBSPOT_ACCESS_TOKEN not set" /> · needs the Transactional Email add-on and a transactional email whose
              template uses {'{{ custom.subject }}'} and {'{{ custom.body }}'}.
            </>
          }
        >
          <span className="row">
            <Toggle checked={s.hubspot.enabled} onChange={(v) => setSending({ hubspot: { ...s.hubspot, enabled: v } })} label="Enabled" />
            <input type="text" value={s.hubspot.emailId} placeholder="Transactional email ID" onChange={(e) => setSending({ hubspot: { ...s.hubspot, emailId: e.target.value } })} style={{ maxWidth: 220 }} />
          </span>
        </Field>
        <Field label="Default channel" hint="Pre-selected on approval; approvers can pick any enabled channel.">
          <select value={s.defaultChannel} onChange={(e) => setSending({ defaultChannel: e.target.value as SendChannel })}>
            <option value="smtp">Email server (SMTP)</option>
            <option value="hubspot">HubSpot</option>
          </select>
        </Field>
        <Field label="Send a test email" hint={test.result || 'Sends right away through the saved settings, ignoring the queue and the master switch.'}>
          <span className="row">
            <select value={test.channel} onChange={(e) => setTest({ ...test, channel: e.target.value as SendChannel, result: '' })} style={{ maxWidth: 170 }}>
              <option value="smtp">SMTP</option>
              <option value="hubspot">HubSpot</option>
            </select>
            <input type="email" value={test.to} placeholder="to@seatos.com" onChange={(e) => setTest({ ...test, to: e.target.value, result: '' })} style={{ maxWidth: 240 }} />
            <button className="b" disabled={sendTest.isPending || !test.to || dirty} title={dirty ? 'Save settings first' : undefined} onClick={() => sendTest.mutate()}>
              {sendTest.isPending ? 'Sending…' : 'Send test'}
            </button>
          </span>
        </Field>
      </div>

      <div className="card">
        <h2 className="st">
          <span>Guards</span>
          <span className="d">enforced by the backend, whatever the agent proposes</span>
        </h2>
        <Field label="Dormant accounts">
          <Toggle checked={draft.guards.blockDormant} onChange={(v) => set('guards', { blockDormant: v })} label="Never send proactive email (reactive only)" />
        </Field>
        <Field label="Healthy accounts">
          <Toggle checked={draft.guards.blockHealthy} onChange={(v) => set('guards', { blockHealthy: v })} label="Never send proactive email" />
        </Field>
      </div>

      <WeeklyData syncTokenSet={server.weeklyIngestToken} />

      <div className="card">
        <h2 className="st">
          <span>Runs</span>
          <button className="b tlb" disabled={runNow.isPending || dirty} title={dirty ? 'Save settings first' : undefined} onClick={() => runNow.mutate()}>
            {runNow.isPending ? 'Starting…' : 'Run now'}
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
                  {r.label} <span className="d">· {r.trigger} · {r.agent}{r.playbookVersion ? ` · ${r.playbookVersion}` : ''}</span>
                </b>
                <span className="d">
                  started {formatEventTime(r.startedAt)} · {r.cases} assessed · {r.outreach} need outreach
                  {r.error ? ` · ${r.error}` : r.summary ? ` · ${r.summary}` : ''}
                </span>
              </div>
              <span className={`tg st ${r.status === 'completed' ? 'sent' : r.status === 'failed' ? 'failed' : 'queued'}`}>{r.status}</span>
            </div>
          ))
        ) : (
          <div className="d">No runs yet.</div>
        )}
      </div>
    </div>
  );
}
