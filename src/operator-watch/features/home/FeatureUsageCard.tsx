import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFeatureUsage } from '../../api/queries';

const shortWeek = (w: string) => w.slice(5);

/** Home: pick a SeatOS feature and see which operators used it over the last four weeks of usage data. */
export function FeatureUsageCard() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [text, setText] = useState('');
  const picker = useFeatureUsage();
  const usage = useFeatureUsage(code || undefined);
  const features = picker.data?.features ?? [];
  /** Typing narrows the list; the feature is chosen once the text is a feature name, or a single feature matches it. */
  const pick = (value: string) => {
    setText(value);
    const q = value.trim().toLowerCase();
    const exact = features.find((f) => f.name.toLowerCase() === q);
    const matches = q ? features.filter((f) => `${f.name} ${f.module}`.toLowerCase().includes(q)) : [];
    setCode((exact ?? (matches.length === 1 ? matches[0] : undefined))?.code ?? '');
  };
  const typedNoMatch = text.trim() !== '' && !code;
  const weeks = [...(picker.data?.weeks ?? [])].reverse(); // oldest → newest, left to right
  const operators = code ? (usage.data?.operators ?? []) : [];

  return (
    <div className="card">
      <h2 className="st">
        <span>Feature usage · last 4 weeks</span>
        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <input
            list="feature-options"
            value={text}
            onChange={(e) => pick(e.target.value)}
            placeholder="Search a feature…"
            aria-label="Search a feature"
            autoComplete="off"
            style={{ width: 260 }}
          />
          {text && (
            <button type="button" className="b tlb" onClick={() => pick('')} aria-label="Clear feature">
              ✕
            </button>
          )}
          <datalist id="feature-options">
            {features.map((f) => (
              <option key={f.code} value={f.name} label={f.module} />
            ))}
          </datalist>
        </span>
      </h2>
      {!code && (
        <div className="d">{typedNoMatch ? 'Keep typing, or choose a feature from the suggestions.' : 'Search or pick a feature to see who used it in each of the last four weeks.'}</div>
      )}
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
