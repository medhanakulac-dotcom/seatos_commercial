import { useLeader } from '../../api/queries';
import { Avatar } from '../../components/tags';
import { ownerName, pct } from '../../lib/format';

const Owner = ({ owner }: { owner: string | null }) => (
  <div className="acct">
    <Avatar name={ownerName(owner)} />
    <b>{ownerName(owner)}</b>
  </div>
);

/**
 * Completion by owner. Counts only cases with email work: Reactive Only and Healthy have no email.
 * Done = approved or closed. Expired = still pending or on hold when the next week started.
 */
export function LeaderPage() {
  const { data } = useLeader();
  if (!data) return <div className="loading">Loading…</div>;

  const tw = data.thisWeek;
  const lw = data.lastWeek;
  const T = tw.reduce((n, r) => n + r.total, 0);
  const D = tw.reduce((n, r) => n + r.done, 0);
  const notDrafted = tw.reduce((n, r) => n + r.notDrafted, 0);
  const LT = lw.rows.reduce((n, r) => n + r.total, 0);
  const LE = lw.rows.reduce((n, r) => n + r.expired, 0);

  return (
    <>
      <div className="ph">
        <div>
          <h1>Leader dashboard</h1>
          <div className="sub">
            Completion by owner · this run {data.week} · previous run {lw.week}
          </div>
        </div>
      </div>
      <h2 className="sec" style={{ marginTop: 8 }}>
        <i>01</i>This run<span className="r">{data.week}</span>
      </h2>
      <div className="grid g4" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 16 }}>
        <div className="card">
          <div className="lab">Team completed</div>
          <div className="big-pct">{pct(D, T)}%</div>
          <div className="d">
            {D} of {T} cases
          </div>
        </div>
        <div className="card">
          <div className="lab">Still open</div>
          <div className="big-pct">{T - D}</div>
          <div className="d">pending, on hold or returned</div>
        </div>
        <div className="card">
          <div className="lab">Not drafted yet</div>
          <div className="big-pct">{notDrafted}</div>
          <div className="d">need Generate before review</div>
        </div>
      </div>
      <div className="tw">
        <table className="lt">
          <thead>
            <tr>
              <th>Owner</th>
              <th>Completed</th>
              <th className="n">%</th>
              <th className="n">Done / Total</th>
              <th className="n">Approved</th>
              <th className="n">Closed</th>
              <th className="n">Returned</th>
              <th className="n">On hold</th>
              <th className="n">Pending</th>
            </tr>
          </thead>
          <tbody>
            {tw.length ? (
              tw.map((r) => (
                <tr key={r.owner ?? '—'}>
                  <td>
                    <Owner owner={r.owner} />
                  </td>
                  <td>
                    <div className="pbar">
                      <i style={{ width: `${pct(r.done, r.total)}%` }} />
                    </div>
                  </td>
                  <td className="n">
                    <b>{pct(r.done, r.total)}%</b>
                  </td>
                  <td className="n">
                    {r.done} / {r.total}
                  </td>
                  <td className="n">{r.approved}</td>
                  <td className="n">{r.closed}</td>
                  <td className="n">{r.rejected}</td>
                  <td className="n">{r.hold}</td>
                  <td className="n">{r.pending}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="d" style={{ padding: 30, textAlign: 'center' }}>
                  No cases in this run.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <h2 className="sec">
        <i>02</i>Previous run<span className="r">{lw.week} · expired</span>
      </h2>
      {lw.rows.length ? (
        <>
          <div className="grid g4" style={{ gridTemplateColumns: 'repeat(2,1fr)', marginBottom: 16 }}>
            <div className="card">
              <div className="lab">Team expired</div>
              <div className="big-pct">{pct(LE, LT)}%</div>
              <div className="d">
                {LE} of {LT} cases
              </div>
            </div>
            <div className="card">
              <div className="lab">Finished in time</div>
              <div className="big-pct">{pct(LT - LE, LT)}%</div>
              <div className="d">
                {LT - LE} of {LT} cases
              </div>
            </div>
          </div>
          <div className="tw">
            <table className="lt">
              <thead>
                <tr>
                  <th>Owner</th>
                  <th>Expired</th>
                  <th className="n">%</th>
                  <th className="n">Expired / Total</th>
                </tr>
              </thead>
              <tbody>
                {lw.rows.map((r) => (
                  <tr key={r.owner ?? '—'}>
                    <td>
                      <Owner owner={r.owner} />
                    </td>
                    <td>
                      <div className="pbar red">
                        <i style={{ width: `${pct(r.expired, r.total)}%` }} />
                      </div>
                    </td>
                    <td className="n">
                      <b>{pct(r.expired, r.total)}%</b>
                    </td>
                    <td className="n">
                      {r.expired} / {r.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="card">
          <div className="d">
            No previous run yet. Its numbers appear once the next run opens and this run's unfinished cases expire.
          </div>
        </div>
      )}
      <div className="def">
        <b>How it is counted.</b> Only cases with email work count: Reactive Only and Healthy accounts have no email, so they are left out. <b>Done</b> = approved or
        closed. <b>Returned</b> (rejected) and <b>on hold</b> are not done. <b>Expired</b> = still pending or on hold when the new week started. Percentages are per
        owner.
      </div>
    </>
  );
}
