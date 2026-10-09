import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAccount, useAccounts, useMeta } from '../../api/queries';
import type { AccountDetail, AccountSummary, Decision, RewriteMode, SendChannel } from '../../api/types';
import { useUiState } from '../../app/UiState';
import { OwnerSelect } from '../../components/OwnerSelect';
import { HealthTag, SegTag } from '../../components/tags';
import { awaitingReview, formatSendTime, inReview, ownerFromKey, ownerName, plural } from '../../lib/format';
import { LanguageBar } from '../drafts/LanguageBar';
import { draftBadge, MailHeader, qaLabel } from '../drafts/MailHeader';
import { useBulkApprove, useDecision, usePromptRewrite, useRewriteDraft } from '../drafts/useDraftActions';

const REWRITES: [RewriteMode, string, 'short' | 'warm' | 'direct' | null][] = [
  ['regen', 'Regenerate', null],
  ['shorter', 'Shorter', 'short'],
  ['warmer', 'Warmer', 'warm'],
  ['direct', 'More direct', 'direct'],
];

/** After a decision, move to the next pending case below this one, else the first pending anywhere. */
function nextPending(visible: AccountSummary[], all: AccountSummary[], currentId: string): string | undefined {
  const i = visible.findIndex((a) => a.id === currentId);
  const pending = (a: AccountSummary) => a.state === 'pending' && a.id !== currentId;
  return (visible.slice(i + 1).find(pending) ?? visible.find(pending) ?? all.find(pending))?.id;
}

function ReviewPanel({ account: c, onDecided }: { account: AccountDetail; onDecided: (decision: Decision) => void }) {
  const navigate = useNavigate();
  const { decide, busy: deciding } = useDecision();
  const { rewrite, setLanguage, busy: rewriting } = useRewriteDraft();
  const prompt = usePromptRewrite();
  const [editing, setEditing] = useState(false);
  const [edited, setEdited] = useState('');
  // Reject, Hold and Close all take a reason; Reject's is expected, Hold/Close's is optional.
  const [reasonFor, setReasonFor] = useState<'reject' | 'hold' | 'close' | null>(null);
  const rejecting = reasonFor !== null;
  const [reason, setReason] = useState('');
  const [instruction, setInstruction] = useState('');
  const [promptNote, setPromptNote] = useState('');
  const { data: meta } = useMeta();
  const sending = meta?.sending;
  // Approval is two steps: choose the channel and confirm the recipient, then confirm.
  const [approving, setApproving] = useState(false);
  const [channel, setChannel] = useState<SendChannel | ''>('');
  const [recipient, setRecipient] = useState('');
  const gen = rewriting || prompt.isPending;
  const draft = c.draft;
  const approved = c.state === 'approved';
  const templated = draft?.writer === 'template';
  const queuedJob = c.sendJobs.find((j) => j.status === 'queued' || j.status === 'sending' || j.status === 'sent');

  const act = (decision: Decision, extra: { reason?: string; editedBody?: string; channel?: SendChannel; recipient?: string } = {}) =>
    decide(c.id, decision, extra, () => {
      setEditing(false);
      setReasonFor(null);
      setApproving(false);
      onDecided(decision);
    });

  const startApprove = () => {
    setChannel(sending?.defaultChannel ?? sending?.channels[0]?.id ?? '');
    setRecipient(c.contacts[0]?.email ?? '');
    setApproving(true);
  };
  const confirmApprove = () =>
    act('approve', { channel: channel || undefined, recipient: recipient.trim(), ...(editing ? { editedBody: edited } : {}) });

  const runPrompt = () => {
    const text = instruction.trim();
    if (!text) return setPromptNote('Write a prompt first.');
    setPromptNote('');
    prompt.mutate(
      { id: c.id, instruction: text },
      {
        onSuccess: (r) => {
          if (r.applied) setInstruction('');
          else setPromptNote(r.message);
        },
        onError: (e) => setPromptNote(`The email AI returned an error: ${e.message}`),
      },
    );
  };

  if (!draft) return <div className="card d">This case has no draft.</div>;

  return (
    <div className={`card ${approved ? '' : 'human'}`} style={approved ? { boxShadow: 'inset 0 0 0 2px var(--ok)' } : undefined}>
      <div className="lab" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>
          {c.caseId ?? c.id} · {c.play} email → {c.outbox}
        </span>
        <span className={`tg st ${c.state}`}>{c.state}</span>
      </div>
      <h2 style={{ fontSize: 22, margin: '6px 0' }}>
        <span onClick={() => navigate(`/accounts/${c.id}`)} style={{ cursor: 'pointer' }}>
          {c.name}
        </span>
      </h2>
      <div className="row">
        <SegTag segment={c.segment} />
        <HealthTag account={c} />
        <span className="chip" style={{ margin: 0 }}>
          <b>{c.playbook}</b>
        </span>
        {c.playbook === 'Rescue' && (
          <span className="chip" style={{ margin: 0, background: 'var(--amber-bg)', color: 'var(--amber)' }}>
            📞 Requests a call
          </span>
        )}
        {c.signals.map((s, i) => (
          <span key={i} className="chip" style={{ margin: 0 }}>
            {s.text}
          </span>
        ))}
      </div>
      {!editing && !rejecting && !approving && templated && <LanguageBar value={c.language} disabled={gen} onChange={(lang) => setLanguage(c.id, lang)} />}
      <MailHeader draft={draft} style={{ marginTop: 12 }} />
      {editing ? <textarea id="ta" value={edited} onChange={(e) => setEdited(e.target.value)} aria-label="Edit draft" /> : <div className="draft">{draft.body}</div>}
      <div className="d">
        draft_hash {draft.hash} · {qaLabel(draft)} · token TTL {draft.tokenTtlHours}h
      </div>
      {c.voidNote && <div className="void">{c.voidNote}</div>}
      {queuedJob && (
        <div className="d" style={{ marginTop: 8 }}>
          {queuedJob.status === 'sent' && queuedJob.deliveredTo && queuedJob.deliveredTo !== queuedJob.recipient
            ? `Test mode: delivered to ${queuedJob.deliveredTo} only — ${queuedJob.recipient} was not emailed`
            : `${queuedJob.status === 'sent' ? 'Sent' : 'Queued'} via ${queuedJob.channel === 'smtp' ? 'email server' : 'HubSpot'} to ${queuedJob.recipient}${queuedJob.status === 'sent' ? '' : ` · ${formatSendTime(queuedJob.scheduledFor)}`}`}
        </div>
      )}
      {!rejecting && !editing && !approving && (
        <>
          <div className="row" style={{ marginTop: 12 }}>
            {gen ? <span className="gen">Rewriting…</span> : <span className="tg llm">{draftBadge(draft)}</span>}
            {templated ? (
              REWRITES.map(([mode, label, mod]) => (
                <button key={mode} className={`b ${mod && draft.mods[mod] ? 'on' : ''}`} disabled={gen} onClick={() => rewrite(c.id, mode)}>
                  {label}
                </button>
              ))
            ) : (
              <span className="d">Use Edit to change this draft, or the prompt below</span>
            )}
          </div>
          <PromptBox value={instruction} onChange={setInstruction} disabled={gen} busy={prompt.isPending} onSubmit={runPrompt} note={promptNote} />
        </>
      )}
      {c.rejectReason && c.state === 'rejected' && <div className="void">Returned to triage — “{c.rejectReason}”</div>}
      {approving && sending && !sending.enabled && <div className="notice">Sending is paused by an admin — this email will wait in the queue until it is turned on.</div>}
      {approving && sending?.redirected && <div className="notice">Test mode is on: the email will be delivered to the admin's test address, not this recipient.</div>}
      <div className="row actbar" style={{ marginTop: 16 }}>
        {approving ? (
          <div className="approve-form">
            <select value={channel} onChange={(e) => setChannel(e.target.value as SendChannel)} aria-label="Send via">
              {sending?.channels.length ? (
                sending.channels.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    Send via {ch.label}
                  </option>
                ))
              ) : (
                <option value="">No sending channel enabled</option>
              )}
            </select>
            <input className="inp" type="email" placeholder="Recipient email" value={recipient} onChange={(e) => setRecipient(e.target.value)} aria-label="Recipient" />
            <button className="b pri" disabled={deciding || !channel || !recipient.trim()} onClick={confirmApprove}>
              Confirm approve{sending ? ` · ${sending.schedule}` : ''}
            </button>
            <button className="b" onClick={() => setApproving(false)}>
              Cancel
            </button>
          </div>
        ) : rejecting ? (
          <>
            <input
              className="inp"
              id="rj"
              placeholder={reasonFor === 'reject' ? 'Reason (goes back to SUP-1)' : 'Reason (optional)'}
              maxLength={500}
              style={{ flex: 1, minWidth: 200 }}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <button
              className={reasonFor === 'reject' ? 'b rj' : 'b'}
              disabled={deciding}
              onClick={() => act(reasonFor, reasonFor === 'reject' || !reason.trim() ? (reasonFor === 'reject' ? { reason } : {}) : { reason: reason.trim() })}
            >
              Confirm {reasonFor}
            </button>
            <button className="b" onClick={() => setReasonFor(null)}>
              Cancel
            </button>
          </>
        ) : editing ? (
          <>
            <button className="b pri" disabled={deciding || !edited.trim()} onClick={startApprove}>
              Save &amp; approve…
            </button>
            <button className="b" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <button className="b pri" disabled={deciding || approved} onClick={startApprove}>
              Approve to send…
            </button>
            <button
              className="b"
              onClick={() => {
                setEdited(draft.body);
                setEditing(true);
              }}
            >
              Edit
            </button>
            <button
              className="b"
              disabled={deciding}
              onClick={() => {
                setReason('');
                setReasonFor('hold');
              }}
            >
              Hold
            </button>
            <button
              className="b rj"
              onClick={() => {
                setReason('');
                setReasonFor('reject');
              }}
            >
              Reject
            </button>
            <button className="b" title="Remove this case from the queue" disabled={deciding}
              onClick={() => {
                setReason('');
                setReasonFor('close');
              }}
            >
              Close case
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function PromptBox({ value, onChange, disabled, busy, onSubmit, note }: { value: string; onChange: (v: string) => void; disabled: boolean; busy: boolean; onSubmit: () => void; note: string }) {
  const { data: meta } = useMeta();
  const connected = !!meta?.capabilities.emailRewrite;
  return (
    <div className="promptbox">
      <div className="lab">Prompt for regeneration</div>
      <textarea
        id="regprompt"
        placeholder="Tell the AI how to rewrite this email… e.g. mention their Krabi routes, keep it under 100 words, ask for a reply by Friday"
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="row">
        <button className="b pri" disabled={disabled} onClick={onSubmit}>
          {busy ? 'Rewriting…' : 'Regenerate with prompt'}
        </button>
        <span className="d">{connected ? 'Email AI connected' : "Email AI is not connected yet — the prompt won't change the draft"}</span>
      </div>
      {note && (
        <div className="void" style={{ marginTop: 8 }}>
          {note}
        </div>
      )}
    </div>
  );
}

export function ApprovalsPage() {
  const { data: accounts, isPending } = useAccounts();
  const { data: meta } = useMeta();
  const { approvals: apr, setApprovals } = useUiState();
  const [params, setParams] = useSearchParams();
  const bulk = useBulkApprove();
  const queueRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  const rev = (accounts ?? []).filter(inReview);
  const revByOwner = rev.filter((a) => apr.owner === 'All' || a.owner === ownerFromKey(apr.owner));
  const playbooks = [...new Set(revByOwner.map((a) => a.playbook))];
  const pb = apr.pb !== 'All' && !playbooks.includes(apr.pb) ? 'All' : apr.pb;
  const visible = revByOwner.filter((a) => pb === 'All' || a.playbook === pb);
  const requested = params.get('case');
  const currentId = visible.find((a) => a.id === requested)?.id ?? visible[0]?.id;
  const { data: current } = useAccount(currentId);
  const select = (id: string | undefined) => id && setParams({ case: id }, { replace: true });

  // Keep the selected case visible inside the queue without scrolling the page itself.
  useEffect(() => {
    const queue = queueRef.current;
    const on = queue?.querySelector<HTMLElement>('.qi.on');
    if (!queue || !on) return;
    const top = on.offsetTop - queue.offsetTop;
    if (top < queue.scrollTop) queue.scrollTop = top;
    else if (top + on.offsetHeight > queue.scrollTop + queue.clientHeight) queue.scrollTop = top + on.offsetHeight - queue.clientHeight;
  }, [currentId]);

  if (isPending || !accounts || !meta) return <div className="loading">Loading…</div>;

  const pendingN = accounts.filter(awaitingReview).length;
  const count = (s: string) => accounts.filter((a) => a.state === s).length;
  const undrafted = accounts.filter((a) => !a.noSend && !a.drafted).length;
  const bulkN = visible.filter((a) => a.state === 'pending').length;
  const strip: [string, number, string][] = [
    ['Pending', pendingN, 'pending'],
    ['Approved', count('approved'), 'approved'],
    ['On hold', count('hold'), 'hold'],
    ['Returned', count('rejected'), 'rejected'],
  ];

  return (
    <>
      <div className="ph">
        <div>
          <h1>Approvals</h1>
          <div className="sub">
            GATE-1 · review the draft, then approve to send {meta.sending.schedule === 'immediately' ? 'immediately' : meta.sending.schedule} ·{' '}
            {undrafted ? `${plural(undrafted, 'account')} ${undrafted === 1 ? 'has' : 'have'} no draft yet (generate from Accounts) · ` : ''}
            QA has not run on this data
          </div>
        </div>
      </div>
      <div className="grid g4" style={{ marginBottom: 18 }}>
        {strip.map(([label, n, s]) => (
          <div key={s} className={`card ${s === 'pending' ? 'human' : ''}`}>
            <div className="lab">{label}</div>
            <div className="big">{n}</div>
          </div>
        ))}
      </div>
      <div className="tools">
        <button className={`b ${pb === 'All' ? 'on' : ''}`} onClick={() => setApprovals((s) => ({ ...s, pb: 'All' }))}>
          All
        </button>
        {playbooks.map((p) => (
          <button key={p} className={`b ${pb === p ? 'on' : ''}`} onClick={() => setApprovals((s) => ({ ...s, pb: p }))}>
            {p} <span className="d">{revByOwner.filter((a) => a.playbook === p).length}</span>
          </button>
        ))}
        <OwnerSelect all={accounts} list={rev} value={apr.owner} onChange={(owner) => setApprovals((s) => ({ ...s, owner }))} />
        {pb !== 'All' && bulkN > 0 && (
          <button
            className="b pri"
            disabled={bulk.isPending}
            onClick={() => bulk.mutate({ playbook: pb, owner: apr.owner === 'All' ? undefined : ownerFromKey(apr.owner) })}
          >
            Approve all {pb} ({bulkN})
          </button>
        )}
      </div>
      <div className="split">
        <div className="q" id="queue" ref={queueRef}>
          {visible.length ? (
            visible.map((a) => (
              <button
                key={a.id}
                className={`qi ${a.id === currentId ? 'on' : ''}`}
                onClick={() => {
                  select(a.id);
                  if (window.innerWidth <= 1000) detailRef.current?.scrollIntoView({ block: 'start' });
                }}
              >
                <div className="l1">
                  <b>{a.name}</b>
                </div>
                <div className="l2">
                  <span>
                    {ownerName(a.owner)} · {a.segment} · {a.health} · {a.language.toUpperCase()}
                  </span>
                  <span className={`tg st ${a.state}`} style={{ padding: '1px 9px' }}>
                    {a.state}
                  </span>
                </div>
              </button>
            ))
          ) : (
            <div className="d" style={{ padding: 20 }}>
              No cases.
            </div>
          )}
        </div>
        <div className="detail" id="detail" ref={detailRef}>
          {current && current.id === currentId ? (
            <ReviewPanel key={current.id} account={current} onDecided={() => select(nextPending(visible, rev, current.id))} />
          ) : (
            <div className="card d">{currentId ? 'Loading…' : 'Select a case.'}</div>
          )}
        </div>
      </div>
    </>
  );
}
