import { useState } from 'react';
import { useMe, useTmsLink } from '../../api/queries';
import type { TmsLink } from '../../api/types';

/** "SeatOS" row of the About card: the TMS operator this account is linked to, or the means to link it. */
export function TmsLinkRow({ accountId, link }: { accountId: string; link: TmsLink | undefined }) {
  const { data: me } = useMe();
  const canReview = !!me?.permissions.includes('workspace:review');
  const { confirm, resolve } = useTmsLink();
  const [picking, setPicking] = useState(false);
  if (!link) return null;

  const lookAgain = canReview && (
    <button className="b tlb" disabled={resolve.isPending} onClick={() => resolve.mutate(accountId)}>
      {resolve.isPending ? 'Looking up…' : 'Look up again'}
    </button>
  );

  let value: React.ReactNode;
  if (link.status === 'linked') {
    value = (
      <span>
        {link.tmsOperatorName} · #{link.tmsOperatorId}
        {link.source === 'human' && <span className="d"> (confirmed by {link.confirmedBy ?? 'a teammate'})</span>}
        {link.candidates.find((c) => c.tmsOperatorId === link.tmsOperatorId)?.domain && (
          <span className="d" style={{ display: 'block' }}>
            {link.candidates.find((c) => c.tmsOperatorId === link.tmsOperatorId)?.domain}
          </span>
        )}
      </span>
    );
  } else if (link.status === 'needs_confirmation') {
    value = canReview ? (
      <span>
        <button className="tms-warn" aria-expanded={picking} onClick={() => setPicking(!picking)}>
          Confirm SeatOS operator
        </button>
      </span>
    ) : (
      <span className="tms-warn" style={{ cursor: 'default' }}>
        Needs confirmation
      </span>
    );
  } else {
    value = (
      <span>
        <span className="d">Not linked</span> {lookAgain}
      </span>
    );
  }

  return (
    <>
      <b>SeatOS</b>
      {value}
      {link.status === 'needs_confirmation' && canReview && picking && (
        <div className="tms-pick" role="group" aria-label="SeatOS operator candidates">
          {link.candidates.map((c) => (
            <div className="cand" key={c.tmsOperatorId}>
              <div className="grow">
                <b style={{ color: 'var(--ink)' }}>{c.name}</b> · #{c.tmsOperatorId}
                {!c.active && <span className="d"> (inactive)</span>}
                {c.domain && <span className="d" style={{ display: 'block' }}>{c.domain}</span>}
              </div>
              <button
                className="b pri tlb"
                aria-label={`Confirm ${c.name}`}
                disabled={confirm.isPending}
                onClick={() => confirm.mutate({ id: accountId, tmsOperatorId: c.tmsOperatorId })}
              >
                {confirm.isPending && confirm.variables?.tmsOperatorId === c.tmsOperatorId ? 'Confirming…' : 'Confirm'}
              </button>
            </div>
          ))}
          <div>{lookAgain}</div>
        </div>
      )}
    </>
  );
}
