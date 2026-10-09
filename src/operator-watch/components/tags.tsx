import type { AccountSummary, CaseState, Language, Segment } from '../api/types';
import { initials } from '../lib/format';

export const SegTag = ({ segment, style }: { segment: Segment; style?: React.CSSProperties }) => (
  <span className={`seg ${segment}`} style={style}>
    {segment}
  </span>
);

/** Dormant accounts show "Reactive" instead of a product-health label. */
export const HealthTag = ({ account }: { account: Pick<AccountSummary, 'dormant' | 'health'> }) =>
  account.dormant ? <span className="tg">Reactive</span> : <span className={`hl ${account.health}`}>{account.health}</span>;

export const StateTag = ({ state, style }: { state: CaseState; style?: React.CSSProperties }) => (
  <span className={`tg st ${state}`} style={style}>
    {state.replace('_', ' ')}
  </span>
);

export const LangTag = ({ language, title }: { language: Language; title?: string }) => (
  <span className="tg llm" title={title}>
    {language.toUpperCase()}
  </span>
);

export const Avatar = ({ name, size, title, style, className = '' }: { name: string; size?: number; title?: string; style?: React.CSSProperties; className?: string }) => (
  <span
    className={`av ${className}`.trim()}
    title={title}
    style={size ? { width: size, height: size, fontSize: size < 30 ? 10 : undefined, ...style } : style}
  >
    {initials(name)}
  </span>
);
