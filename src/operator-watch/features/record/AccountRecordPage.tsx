import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAccount, useMeta } from '../../api/queries';
import type { AccountDetail, CaseEvent } from '../../api/types';
import { Avatar, HealthTag, SegTag, StateTag } from '../../components/tags';
import { awaitingReview, formatEventTime, formatSendTime, money, ownerName } from '../../lib/format';
import { LanguageBar } from '../drafts/LanguageBar';
import { draftBadge, MailHeader, qaLabel } from '../drafts/MailHeader';
import { useDecision, useGenerateDraft, useGeneratingIds, useNotes, useRewriteDraft } from '../drafts/useDraftActions';
import { AssistantChat } from './AssistantChat';
import { HubSpotActivity } from './HubSpotActivity';
import { TmsLinkRow } from './TmsLinkRow';
import { WeeklyNumbers } from './WeeklyNumbers';

type Tab = 'overview' | 'activity' | 'email';

function approvalText(a: AccountDetail): string {
  if (a.dormant) return 'No outreach for reactive accounts.';
  const job = a.sendJobs.find((j) => j.status !== 'cancelled');
  switch (a.state) {
    case 'closed':
      return 'Case closed — removed from the queue.';
    case 'healthy':
      return 'No case this run — the account is Healthy.';
    case 'no_action':
      return 'The agent found no outreach needed this run.';
    case 'no_case':
      return 'Not assessed in the current run.';
    case 'expired':
      return 'Expired — the next run started before a decision.';
    case 'approved':
      if (!job) return 'Approved.';
      if (job.status === 'sent' && job.deliveredTo && job.deliveredTo !== job.recipient) return `Test mode: delivered to ${job.deliveredTo} only — ${job.recipient} was not emailed.`;
      if (job.status === 'sent') return `Sent to ${job.recipient} via ${job.channel === 'smtp' ? 'email server' : 'HubSpot'}.`;
      if (job.status === 'failed') return `Sending failed: ${job.error ?? 'unknown error'}`;
      return `Queued to ${job.recipient} via ${job.channel === 'smtp' ? 'email server' : 'HubSpot'} · ${formatSendTime(job.scheduledFor)}.`;
    case 'pending':
      return a.drafted ? 'Waiting for your review.' : 'No draft yet — click Generate draft.';
    case 'hold':
      return 'On hold — will not be sent.';
    default:
      return 'Returned to triage with a reason.';
  }
}

function SyncTag({ event, hasDeal, onRetry }: { event: CaseEvent; hasDeal: boolean; onRetry: () => void }) {
  if (event.kind !== 'note' || !event.crmSync) return null;
  if (event.crmSync === 'synced') return <span className="sync ok">● synced to HubSpot</span>;
  if (event.crmSync === 'pending') return <span className="sync wait">sending to HubSpot…</span>;
  if (event.crmSync === 'failed')
    return (
      <>
        <span className="sync bad" title={event.crmError ?? undefined}>
          not sent
        </span>
        <button className="sync-retry" onClick={onRetry}>
          retry
        </button>
      </>
    );
  return (
    <span className="sync" title={hasDeal ? 'HubSpot is not connected to this page' : 'This account has no HubSpot deal'}>
      not sent to HubSpot
    </span>
  );
}

export function AccountRecordPage() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = (['overview', 'activity', 'email'].includes(params.get('tab') ?? '') ? params.get('tab') : 'overview') as Tab;
  const setTab = (t: Tab) => setParams(t === 'overview' ? {} : { tab: t }, { replace: true });
  const navigate = useNavigate();
  const { data: a, isPending, error } = useAccount(id);
  const { data: meta } = useMeta();
  const generate = useGenerateDraft();
  const generating = useGeneratingIds().has(id);
  const { decide } = useDecision();
  const { setLanguage, busy } = useRewriteDraft();
  const notes = useNotes();
  const [note, setNote] = useState('');

  if (error) return <div className="card d">This account could not be loaded: {error.message}</div>;
  if (isPending || !a || !meta) return <div className="loading">Loading…</div>;

  const review = () => navigate(`/approvals?case=${encodeURIComponent(a.id)}`);
  const generateButton = (style?: React.CSSProperties) => (
    <button className="b pri" style={style} disabled={generating} onClick={() => generate.mutate(a.id)}>
      {generating ? 'Generating…' : 'Generate draft'}
    </button>
  );
  const addNote = () => {
    const text = note.trim();
    if (!text) return;
    notes.add.mutate({ id: a.id, text }, { onSuccess: () => setNote('') });
  };

  const props = (
    <div className="card">
      <h2 className="st">
        <span>About this account</span>
      </h2>
      <div className="prop">
        <b>Case</b>
        <span>{a.caseId ?? 'No case this week'}</span>
        <b>Week</b>
        <span>{a.week}</span>
        <b>Account ID</b>
        <span>{a.id}</span>
        <b>Owner</b>
        <span>{ownerName(a.owner)}</span>
        <b>Country</b>
        <span>{a.country ?? '—'}</span>
        <b>Deal amount</b>
        <span>{money(a.amount) ?? '—'}</span>
        <b>Close date</b>
        <span>{a.closeDate ?? '—'}</span>
        <b>Segment</b>
        <SegTag segment={a.segment} style={{ justifySelf: 'start' }} />
        <b>Health</b>
        <span>
          <HealthTag account={a} />
        </span>
        <b>HubSpot health</b>
        <span>{a.crmHealth}</span>
        <b>Playbook</b>
        <span>
          <b style={{ color: 'var(--ink)' }}>{a.playbook}</b>
        </span>
        <b>Status</b>
        <StateTag state={a.state} style={{ justifySelf: 'start' }} />
        <b>Email language</b>
        <span>{a.noSend ? '—' : meta.languages[a.language]}</span>
        <b>Contact</b>
        <span style={{ wordBreak: 'break-all' }}>{a.contacts[0] ? `${a.contacts[0].name} · ${a.contacts[0].email}` : '—'}</span>
        <TmsLinkRow accountId={a.id} link={a.tmsLink} />
      </div>
    </div>
  );

  const deals = (
    <div className="card">
      <h2 className="st">
        <span>HubSpot deals</span>
        <span className="d">{a.deals.length}</span>
      </h2>
      {a.deals.map((d) => (
        <div className="task" key={d.id}>
          <div className="grow">
            <b>{d.pipeline}</b>
            <span className="d">
              {d.stage}
              {d.amount != null ? ` · ${money(d.amount)}` : ''}
              {d.closeDate ? ` · closes ${d.closeDate}` : ''}
            </span>
          </div>
          {d.url && (
            <a href={d.url} target="_blank" rel="noopener noreferrer" className="b tlb" style={{ textDecoration: 'none' }}>
              Open ↗
            </a>
          )}
        </div>
      ))}
    </div>
  );

  const owner = (
    <div className="card">
      <h2 className="st">
        <span>Owner</span>
      </h2>
      <div className="task" style={{ border: 0, padding: 0 }}>
        <Avatar name={ownerName(a.owner)} />
        <div className="grow">
          <b>{ownerName(a.owner)}</b>
          <span className="d">Sends from their mailbox</span>
        </div>
      </div>
    </div>
  );

  const approval = (
    <div className={`card ${awaitingReview(a) ? 'human' : ''}`}>
      <h2 className="st">
        <span>Approval</span>
      </h2>
      <div className={`tg st ${a.state}`} style={{ fontSize: 13 }}>
        {a.state}
      </div>
      <p className="d" style={{ margin: '10px 0' }}>
        {approvalText(a)}
      </p>
      {a.state === 'closed' ? (
        <button className="b" style={{ width: '100%' }} onClick={() => decide(a.id, 'reopen')}>
          Reopen case
        </button>
      ) : a.noSend ? null : a.drafted ? (
        <button className="b pri" style={{ width: '100%' }} onClick={review}>
          Open in Approvals →
        </button>
      ) : (
        generateButton({ width: '100%' })
      )}
    </div>
  );

  const history = (
    <div className="card">
      <h2 className="st">
        <span>Cases</span>
        <span className="d">{a.cases.length}</span>
      </h2>
      {a.cases.length ? (
        a.cases.map((h) => (
          <div className="task" key={h.caseId}>
            <div className="grow">
              <b>{h.caseId}</b>
              <span className="d">
                {h.week} · {h.playbook}
                {h.current ? ' · this week' : ''}
              </span>
            </div>
            <StateTag state={h.state} />
          </div>
        ))
      ) : (
        <div className="d">No case this week — the account is Healthy.</div>
      )}
    </div>
  );

  let center: React.ReactNode = null;
  if (tab === 'overview') {
    center = (
      <div className="card">
        <h2 className="st">
          <span>Summary</span>
          <span className="tg llm">rule-based</span>
        </h2>
        <div className="box2">{a.summary}</div>
        <div className="box2" style={{ background: 'var(--mint)' }}>
          <b>Suggested next step</b>
          <br />
          {a.next}
        </div>
        <h2 className="st" style={{ marginTop: 18 }}>
          <span>Signals this week</span>
        </h2>
        {a.signals.map((s, i) => (
          <div className="task" key={i}>
            <div className="grow">
              <b>{s.text}</b>
              <span className="d">
                {s.code} · {s.detector}
              </span>
            </div>
          </div>
        ))}
        <h2 className="st" style={{ marginTop: 18 }}>
          <span>Playbook</span>
        </h2>
        <div className="box2">
          <b>{a.playbook}</b>
          <br />
          <span className="d">{a.playbookDescription}</span>
        </div>
      </div>
    );
  } else if (tab === 'activity') {
    center = (
      <>
        <div className="card">
          <div className="notein">
            <input
              id="notein"
              placeholder={`Log a note about ${a.name}…`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addNote()}
            />
            <button className="b pri" disabled={notes.add.isPending} onClick={addNote}>
              Add note
            </button>
          </div>
          <div className="tl">
            {[...a.events].reverse().map((e) => (
              <div key={e.id} className={`ev ${e.kind}`}>
                <div className="t">{formatEventTime(e.at)}</div>
                {e.text}
                <SyncTag event={e} hasDeal={a.deals.length > 0} onRetry={() => notes.retry.mutate({ id: a.id, eventId: e.id })} />
              </div>
            ))}
          </div>
        </div>
        <HubSpotActivity accountId={a.id} />
      </>
    );
  } else if (a.noSend) {
    center = (
      <div className="card">
        <div className="d">{a.dormant ? 'Reactive only — no outreach email for this account.' : 'Healthy — no email is sent for this account.'}</div>
      </div>
    );
  } else if (!a.draft) {
    center = (
      <div className="card">
        <div className="d" style={{ marginBottom: 12 }}>
          No draft has been written for this account yet.
        </div>
        {generateButton()}
      </div>
    );
  } else {
    center = (
      <div className="card">
        <h2 className="st">
          <span>Email draft</span>
          <span className="tg llm">{draftBadge(a.draft)}</span>
        </h2>
        {a.draft.writer === 'template' && <LanguageBar value={a.language} disabled={busy} onChange={(lang) => setLanguage(a.id, lang)} />}
        <MailHeader draft={a.draft} />
        <div className="draft">{a.draft.body}</div>
        {a.voidNote && <div className="void">{a.voidNote}</div>}
        <div className="row">
          <button className="b pri" onClick={review}>
            Review &amp; approve →
          </button>
          <span className="d">
            draft_hash {a.draft.hash} · {qaLabel(a.draft)}
          </span>
        </div>
      </div>
    );
  }

  const tabs: [Tab, string, number?][] = [
    ['overview', 'Overview'],
    ['activity', 'Activity', a.events.length],
    ['email', 'Email'],
  ];

  return (
    <>
      <div className="crumb">
        <button onClick={() => navigate('/accounts')}>Accounts</button>{' '}
        / {a.name}
      </div>
      <div className="rh">
        <Avatar name={a.name} />
        <div>
          <h1 style={{ margin: 0 }}>{a.name}</h1>
          <div className="row" style={{ marginTop: 6 }}>
            <SegTag segment={a.segment} />
            <HealthTag account={a} />
            <StateTag state={a.state} />
          </div>
        </div>
        <div className="row" style={{ marginLeft: 'auto' }}>
          {a.noSend || a.state === 'closed' ? null : a.drafted ? (
            <button className="b pri" onClick={review}>
              Review draft
            </button>
          ) : (
            generateButton()
          )}
          <button className="b" onClick={() => setTab('activity')}>
            Log note
          </button>
        </div>
      </div>
      <div className="tabs">
        {tabs.map(([key, label, n]) => (
          <button key={key} className={tab === key ? 'on' : ''} onClick={() => setTab(key)}>
            {label}
            {n ? <span className="n">{n}</span> : null}
          </button>
        ))}
      </div>
      <div className="rl">
        <div className="grid" style={{ gap: 18, minWidth: 0 }}>
          {props}
          <WeeklyNumbers accountId={a.id} />
          {deals}
          {owner}
          {approval}
          {history}
        </div>
        <div className="grid" style={{ gap: 18, minWidth: 0 }}>
          <div>{center}</div>
          <AssistantChat accountId={a.id} accountName={a.name} />
        </div>
      </div>
    </>
  );
}
