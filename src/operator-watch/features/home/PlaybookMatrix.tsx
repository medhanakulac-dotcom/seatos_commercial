import type { AccountSummary, Health, WorkspaceMeta } from '../../api/types';
import { HEALTH_COLORS, plural } from '../../lib/format';

const SEGMENTS = ['High', 'Mid', 'Low'] as const;
const SEGMENT_LABEL = { High: 'Top priority', Mid: 'Standard', Low: 'Automated' } as const;
const FEATURE_BANDS: Record<Health, string> = { Unhealthy: '0–2', Adopted: '3–4', Healthy: '5–6' };

export function PlaybookMatrix({ accounts, playbooks }: { accounts: AccountSummary[]; playbooks: WorkspaceMeta['playbooks'] }) {
  const dormant = accounts.filter((a) => a.dormant).length;
  return (
    <div className="mx">
      <div />
      {playbooks.healths.map((h) => (
        <div key={h} className="mxh" style={{ color: HEALTH_COLORS[h] }}>
          <i style={{ background: HEALTH_COLORS[h] }} />
          {h} <span className="d">{FEATURE_BANDS[h]}</span>
        </div>
      ))}
      {SEGMENTS.map((segment) => [
        <div key={segment} className="mxr">
          <b>{segment}</b>
          <span className={`seg ${segment}`} style={{ alignSelf: 'flex-start' }}>
            {SEGMENT_LABEL[segment]}
          </span>
        </div>,
        ...playbooks.healths.map((h) => {
          const { name, description } = playbooks.matrix[segment][h];
          const ops = accounts.filter((a) => a.segment === segment && a.health === h);
          return (
            <div key={`${segment}-${h}`} className={`cell ${h}`}>
              <b>{name}</b>
              <div className="d">
                {description}
                {h === 'Healthy' ? ' No email is sent.' : ''}
              </div>
              <div className="ops">
                {ops.slice(0, 4).map((a) => (
                  <span key={a.id}>{a.name}</span>
                ))}
                {ops.length > 4 && <span>+{ops.length - 4} more</span>}
                <span style={{ background: 'transparent', color: 'var(--mute)' }}>{ops.length ? plural(ops.length, 'account') : ''}</span>
              </div>
            </div>
          );
        }),
      ])}
      <div className="mxr">
        <b>Dormant</b>
        <span className="seg Dormant" style={{ alignSelf: 'flex-start' }}>
          Reactive
        </span>
      </div>
      <div className="cell Dormant">
        <b style={{ display: 'inline' }}>{playbooks.dormant.name}</b> <span className="d">{playbooks.dormant.description}</span>{' '}
        <span className="ops">
          <span>{plural(dormant, 'account')}</span>
        </span>
      </div>
    </div>
  );
}
