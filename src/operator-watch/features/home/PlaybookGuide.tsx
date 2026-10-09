/** Static explainer of the two playbook inputs, as written in the team's design. */
export function PlaybookGuide() {
  return (
    <div className="gl">
      <div className="card">
        <div className="lab">Input 1 · Commercial segment</div>
        <p className="d" style={{ margin: '8px 0' }}>
          How valuable an account is to seatOS. Set commercially and reviewed each quarter.
        </p>
        <div className="gr"><span className="seg High">High</span><span>Strategic, top-value accounts. Most hands-on attention, pushed toward full adoption.</span></div>
        <div className="gr"><span className="seg Mid">Mid</span><span>Solid mid-value accounts. Lighter touch; 3 active features is an acceptable baseline.</span></div>
        <div className="gr"><span className="seg Low">Low</span><span>Smaller accounts served by automated motions: activation journeys, nudges, self-service.</span></div>
        <div className="gr"><span className="seg Dormant">Dormant</span><span>Inactive or at-risk, no live engagement. Reactive only.</span></div>
      </div>
      <div className="card">
        <div className="lab">
          Input 2 · Product health{' '}
          <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 600, color: '#cbbda6' }}>by Weekly Active Operators</span>
        </div>
        <p className="d" style={{ margin: '8px 0' }}>
          Count how many of the 6 core seatOS features have a Weekly Active Operator: a real user driving that feature each week.
        </p>
        <div className="gr gr3"><b className="lab">Feature count</b><b className="lab">Health</b><b className="lab">Meaning</b></div>
        <div className="gr gr3"><b style={{ fontSize: 22, color: 'var(--ink)' }}>5–6</b><span className="hl Healthy" style={{ justifySelf: 'start' }}>Healthy</span><span>Strong adoption</span></div>
        <div className="gr gr3"><b style={{ fontSize: 22, color: 'var(--ink)' }}>3–4</b><span className="hl Adopted" style={{ justifySelf: 'start' }}>Adopted</span><span>Acceptable / usable</span></div>
        <div className="gr gr3"><b style={{ fontSize: 22, color: 'var(--ink)' }}>0–2</b><span className="hl Unhealthy" style={{ justifySelf: 'start' }}>Unhealthy</span><span>Low adoption</span></div>
      </div>
      <div className="card">
        <b>Why “Adopted” differs by segment:</b> 3 features is an acceptable baseline, but <b>segment sets the ambition</b>. High accounts keep pushing toward 5–6; Mid and
        Low shift to maintain / self-serve at 3+.
      </div>
    </div>
  );
}
