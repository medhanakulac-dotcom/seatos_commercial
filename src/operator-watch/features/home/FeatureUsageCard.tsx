import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFeatureUsage } from '../../api/queries';

const shortWeek = (w: string) => w.slice(5);

/** Home: pick a SeatOS feature and see which operators used it over the last four weeks of usage data. */
export function FeatureUsageCard() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const picker = useFeatureUsage();
  const usage = useFeatureUsage(code || undefined);
  const features = picker.data?.features ?? [];
  const modules = [...new Set(features.map((f) => f.module))];
  const weeks = [...(picker.data?.weeks ?? [])].reverse(); // oldest → newest, left to right
  const operators = code ? (usage.data?.operators ?? []) : [];

  return (
    <div className="card">
      <h2 className="st">
        <span>Feature usage · last 4 weeks</span>
        <select value={code} onChange={(e) => setCode(e.target.value)} aria-label="Feature" style={{ maxWidth: 280 }}>
          <option value="">Choose a feature…</option>
          {modules.map((m) => (
            <optgroup key={m} label={m}>
              {features
                .filter((f) => f.module === m)
                .map((f) => (
                  <option key={f.code} value={f.code}>
                    {f.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </h2>
      {!code && <div className="d">Pick a feature to see who used it in each of the last four weeks.</div>}
      {code && usage.isPending && <div className="d">Loading…</div>}
      {code && usage.error && <div className="d">Could not load: {usage.error.message}</div>}
      {code && usage.data && (
        <>
          <div className="d" style={{ marginBottom: 6 }}>
            {operators.length} active operator{operators.length === 1 ? '' : 's'} (3+ events in a week) · events (active days) per week
          </div>
          {operators.length ? (
            <div style={{ overflowX: 'auto', maxHeight: 360, overflowY: 'auto' }}>
              <table style={{ width: '100%', fontSize: 12.5, borderCollapse: 'collapse' }}>
                <thead>
                  <tr className="d" style={{ textAlign: 'left' }}>
                    <th>Operator</th>
                    {weeks.map((w) => (
                      <th key={w} style={{ textAlign: 'right' }}>
                        {shortWeek(w)}
                      </th>
                    ))}
                    <th style={{ textAlign: 'right' }}>Weeks</th>
                  </tr>
                </thead>
                <tbody>
                  {operators.map((o) => (
                    <tr
                      key={`${o.operatorName}`}
                      style={{ borderTop: '1px solid var(--line, #eee)', cursor: o.accountId ? 'pointer' : 'default' }}
                      onClick={() => o.accountId && navigate(`/accounts/${o.accountId}`)}
                    >
                      <td>
                        <b>{o.operatorName}</b>
                      </td>
                      {weeks.map((w) => {
                        const a = o.byWeek[w];
                        return (
                          <td key={w} style={{ textAlign: 'right' }} className={a ? undefined : 'd'}>
                            {a ? `${a.events.toLocaleString()} (${a.days}d)` : '—'}
                          </td>
                        );
                      })}
                      <td style={{ textAlign: 'right' }}>{o.activeWeeks}/{weeks.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="d">No operator had 3 or more events on this feature in the last four weeks.</div>
          )}
        </>
      )}
    </div>
  );
}
