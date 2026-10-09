import { useNavigate } from 'react-router-dom';
import { useAccounts, useMe, useSent } from '../../api/queries';
import type { SendJob } from '../../api/types';
import { awaitingReview, formatEventTime, formatSendTime } from '../../lib/format';

const CHANNEL_LABEL = { smtp: 'Email server', hubspot: 'HubSpot' } as const;

function outcome(j: SendJob): { cls: string; text: string } {
  // A test-mode delivery went to the admin's test inbox, never to the client.
  if (j.status === 'sent' && j.deliveredTo && j.deliveredTo !== j.recipient) return { cls: 'queued', text: `test only · delivered to ${j.deliveredTo}` };
  if (j.status === 'sent') return { cls: 'sent', text: `sent ${j.sentAt ? formatEventTime(j.sentAt) : ''}`.trim() };
  if (j.status === 'failed') return { cls: 'failed', text: 'failed' };
  if (j.status === 'sending') return { cls: 'sending', text: 'sending…' };
  return { cls: 'queued', text: `queued · ${formatSendTime(j.scheduledFor)}` };
}

export function SentPage() {
  const { data: accounts } = useAccounts();
  const { data: sent } = useSent();
  const { data: me } = useMe();
  const navigate = useNavigate();
  if (!accounts || !sent) return <div className="loading">Loading…</div>;

  const queued = sent.items.filter((j) => j.status === 'queued' || j.status === 'sending');
  const toClients = sent.items.filter((j) => j.status === 'sent' && (!j.deliveredTo || j.deliveredTo === j.recipient)).length;
  const failed = sent.items.filter((j) => j.status === 'failed').length;
  const waiting = accounts.filter(awaitingReview).length;
  const byPlaybook = queued.reduce<Record<string, number>>((acc, j) => ({ ...acc, [j.playbook ?? '—']: (acc[j.playbook ?? '—'] ?? 0) + 1 }), {});
  const { sending } = sent;
  const card = (label: string, n: number, detail: string, cls = '') => (
    <div className={`card ${cls}`}>
      <div className="lab">{label}</div>
      <div className="big">{n}</div>
      <div className="d">{detail}</div>
    </div>
  );

  return (
    <>
      <div className="ph">
        <div>
          <h1>Sent</h1>
          <div className="sub">
            Approved emails go out {sending.schedule === 'immediately' ? 'as soon as they are approved' : `at the next send slot · ${sending.schedule}`}
          </div>
        </div>
      </div>
      {!sending.enabled && (
        <div className="notice">
          Sending is paused by an admin — approved emails wait in the queue and nothing leaves until it is turned on{me?.role === 'admin' ? ' in Settings' : ''}.
        </div>
      )}
      {sending.redirected && <div className="notice">Test mode: every email is redirected to the admin's test address instead of the customer.</div>}
      <div className="grid g4" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 14 }}>
        {card('Queued to send', queued.length, failed ? `${failed} failed — see below` : 'approved, waiting for the send slot')}
        {card('Waiting for your approval', waiting, 'drafts in Approvals', waiting ? 'human' : '')}
        {card('Sent to clients', toClients, sent.sentCount > toClients ? `${sent.sentCount - toClients} test-mode deliveries went to the test inbox only` : 'emails delivered to clients')}
      </div>
      {queued.length ? (
        <div className="row" style={{ marginBottom: 18 }}>
          <span className="d">Queued by playbook:</span>
          {Object.entries(byPlaybook).map(([playbook, n]) => (
            <span key={playbook} className="chip" style={{ margin: 0 }}>
              <b>{playbook}</b> · {n}
            </span>
          ))}
        </div>
      ) : (
        <div style={{ marginBottom: 18 }} />
      )}
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>Account</th>
              <th>Case</th>
              <th>Playbook</th>
              <th>Via</th>
              <th>To</th>
              <th>draft_hash</th>
              <th>Outcome</th>
            </tr>
          </thead>
          <tbody>
            {sent.items.length ? (
              sent.items.map((j) => {
                const o = outcome(j);
                return (
                  <tr key={j.id} data-open={j.accountId} onClick={() => navigate(`/accounts/${j.accountId}`)}>
                    <td>
                      <b>{j.name}</b>
                    </td>
                    <td>{j.caseId}</td>
                    <td>{j.playbook ?? '—'}</td>
                    <td>{CHANNEL_LABEL[j.channel]}</td>
                    <td title={j.deliveredTo && j.deliveredTo !== j.recipient ? `delivered to ${j.deliveredTo}` : undefined}>{j.recipient}</td>
                    <td>{j.draftHash}</td>
                    <td>
                      <span className={`tg st ${o.cls}`} title={j.error ?? undefined}>
                        {o.text}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="d" style={{ padding: 30, textAlign: 'center' }}>
                  Nothing approved yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
