import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAccount, useZeroTicketIds } from '../../api/queries';
import type { CaseEvent } from '../../api/types';
import { Avatar, HealthTag, SegTag, ZeroTicketTag } from '../../components/tags';
import { Tour, type TourStep } from '../../components/Tour';
import { formatEventTime, money, ownerName } from '../../lib/format';
import { AssistantChat } from './AssistantChat';
import { HubSpotActivity } from './HubSpotActivity';
import { TmsLinkRow } from './TmsLinkRow';
import { useNotes } from './useNotes';
import { WeeklyNumbers } from './WeeklyNumbers';

type Tab = 'overview' | 'activity';

const RECORD_TOUR: TourStep[] = [
  {
    target: '[data-tour="head"]',
    title: 'The account at a glance',
    body: 'Name, segment and health, plus a Zero ticket tag when it sold no tickets in the last two weeks. "Log note" adds a note to the activity and sends it to HubSpot.',
  },
  {
    target: '[data-tour="about"]',
    title: 'About this account',
    body: 'Owner, country, deal amount, its health in HubSpot, the playbook it is on, the main contact, and the link to its SeatOS operator.',
  },
  {
    target: '[data-tour="deals"]',
    title: 'HubSpot deals',
    body: 'Its deals with stage and amount. "Open" jumps to the deal in HubSpot.',
  },
  {
    target: '[data-tour="summary"]',
    title: 'Summary and next step',
    body: 'A short read of the situation, the suggested next step, the signals this week and the playbook. Use the Overview and Activity tabs above to switch to notes and the HubSpot history.',
  },
  {
    target: '[data-tour="weekly"]',
    title: 'SeatOS numbers',
    body: 'WAO per week (how many of the 7 product areas it used), the features it used in the latest week with events and active days, what is new or stopped, and tickets sold. When enough comparable sales exist, it also shows its price against other operators on the same city route, vehicle type and class.',
  },
  {
    target: '[data-tour="chat"]',
    title: 'Ask about this account',
    body: 'Ask about its numbers, its history or what to do next. The assistant reads the account data and the CS Toolkit, and everyone on the team sees the conversation. A chat that has been quiet for 10 minutes starts fresh.',
  },
];

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
  const tab = (['overview', 'activity'].includes(params.get('tab') ?? '') ? params.get('tab') : 'overview') as Tab;
  const setTab = (t: Tab) => setParams(t === 'overview' ? {} : { tab: t }, { replace: true });
  const navigate = useNavigate();
  const { data: a, isPending, error } = useAccount(id);
  const { data: zero } = useZeroTicketIds();
  const notes = useNotes();
  const [note, setNote] = useState('');

  if (error) return <div className="card d">This account could not be loaded: {error.message}</div>;
  if (isPending || !a) return <div className="loading">Loading…</div>;

  const addNote = () => {
    const text = note.trim();
    if (!text) return;
    notes.add.mutate({ id: a.id, text }, { onSuccess: () => setNote('') });
  };

  const props = (
    <div className="card" data-tour="about">
      <h2 className="st">
        <span>About this account</span>
      </h2>
      <div className="prop">
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
        <b>Contact</b>
        <span style={{ wordBreak: 'break-all' }}>{a.contacts[0] ? `${a.contacts[0].name} · ${a.contacts[0].email}` : '—'}</span>
        <TmsLinkRow accountId={a.id} link={a.tmsLink} />
      </div>
    </div>
  );

  const deals = (
    <div className="card" data-tour="deals">
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
        </div>
      </div>
    </div>
  );

  let center: React.ReactNode = null;
  if (tab === 'overview') {
    center = (
      <div className="card">
        <h2 className="st">
          <span>Summary</span>
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
  }

  const tabs: [Tab, string, number?][] = [
    ['overview', 'Overview'],
    ['activity', 'Activity', a.events.length],
  ];

  return (
    <>
      <div className="crumb">
        <button onClick={() => navigate('/accounts')}>Accounts</button>{' '}
        / {a.name}
      </div>
      <div className="rh" data-tour="head">
        <Avatar name={a.name} />
        <div>
          <h1 style={{ margin: 0 }}>{a.name}</h1>
          <div className="row" style={{ marginTop: 6 }}>
            <SegTag segment={a.segment} />
            <HealthTag account={a} />
            {zero?.has(a.id) && <ZeroTicketTag />}
          </div>
        </div>
        <div className="row" style={{ marginLeft: 'auto' }}>
          <Tour id="record" steps={RECORD_TOUR} ready />
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
          {deals}
          {owner}
        </div>
        <div className="grid" style={{ gap: 18, minWidth: 0 }}>
          <div data-tour="summary">{center}</div>
          <div data-tour="weekly">
            <WeeklyNumbers accountId={a.id} />
          </div>
          <div data-tour="chat">
            <AssistantChat accountId={a.id} accountName={a.name} />
          </div>
        </div>
      </div>
    </>
  );
}
