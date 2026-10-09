import { createHash } from 'node:crypto';
import { AccountContext } from '../../../domain/workspace/types/repositories/workspace.ports';

export interface OperatorBrief {
  readonly text: string;
  /** Changes whenever the facts in `text` change, so the same brief is not sent twice. */
  readonly version: string;
}

const MAX_ACTIVITY = 8;

/** Compact, factual snapshot of one operator for the agent. Edit here to change what the agent is told about an account. */
export function buildOperatorBrief(a: AccountContext): OperatorBrief {
  const facts = [
    ...(a.tmsOperatorId != null ? [`SeatOS operator_id: ${a.tmsOperatorId} (use it directly with SeatOS tools; do not look the operator up by name)`] : []),
    `Segment: ${a.segment} · Health: ${a.health} · Playbook: ${a.playbook} · Case state: ${a.state}`,
    `Owner: ${a.owner} · Country: ${a.country ?? 'unknown'}`,
    `Deals: ${a.deals.length ? a.deals.map((d) => `${d.pipeline} / ${d.stage}${d.amount != null ? ` ($${d.amount})` : ''}`).join('; ') : 'none'}`,
    `Signals: ${a.signals.length ? a.signals.join('; ') : 'none'}`,
    `Recent activity: ${a.activity.length ? a.activity.slice(-MAX_ACTIVITY).join(' | ') : 'none'}`,
  ].join('\n');
  const text =
    `Context — ${a.name} (operator_id ${a.id}). This conversation is about this operator; this is its current picture:\n${facts}`;
  return { text, version: createHash('sha1').update(facts).digest('hex').slice(0, 12) };
}
