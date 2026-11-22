import type { CaseEvent, RunRecord } from '../entities/workspace.entities';
import type { AccountView } from './workspace.service';

/**
 * The Engine page: one read of what the weekly run did — how many accounts it read, how many it flagged, what waits for
 * a person, where operators stand on the WAO categories, and which agents exist. Pure: the controller gathers the data.
 */

export type AgentStatus = 'live' | 'phase2' | 'phase3' | 'needs_data';

export interface EngineAgent {
  key: string;
  name: string;
  job: string;
  data: string;
  status: AgentStatus;
  /** What the agent has on its plate now; null when it does not run yet. */
  count: number | null;
  countLabel: string | null;
}

export interface CategoryMix {
  week: string | null;
  /** Operators with usage that week, by number of WAO categories used (index 1..7; 0 is not reported by the sync). */
  byCategories: number[];
  /** Matched accounts that used exactly 2 categories: one category short of WAO. */
  stuckAtTwo: { accountId: string; name: string }[];
}

export interface EngineInput {
  run: RunRecord | undefined;
  views: readonly AccountView[];
  events: readonly (CaseEvent & { name: string })[];
  mix: CategoryMix;
  zeroTicketIds: readonly string[];
  sentCount: number;
}

const QUEUE_LIMIT = 8;

export function engineOverview(input: EngineInput) {
  const { run, views, events, mix, zeroTicketIds, sentCount } = input;
  const inRun = views.filter((v) => v.case && run && v.case.runId === run.id);
  const flagged = inRun.filter((v) => v.case!.outcome === 'outreach');
  const count = (state: string) => flagged.filter((v) => v.case!.state === state).length;
  const pending = flagged.filter((v) => v.case!.state === 'pending');
  const waoActive = mix.byCategories.slice(3).reduce((n, x) => n + x, 0);
  const withUsage = mix.byCategories.reduce((n, x) => n + x, 0);

  const queue = [...pending]
    .sort((a, b) => a.priority - b.priority || a.account.name.localeCompare(b.account.name))
    .slice(0, QUEUE_LIMIT)
    .map((v) => ({
      accountId: v.account.id,
      name: v.account.name,
      owner: v.account.owner,
      playbook: v.playbook.name,
      play: v.case!.playType,
      health: v.health,
      summary: v.summary,
      signals: v.signals.slice(0, 3).map((s) => s.text),
      drafted: v.drafted,
    }));

  const agents: EngineAgent[] = [
    { key: 'scout', name: 'SCOUT', job: 'Flags operators going quiet', data: 'HubSpot health · WAO · weekly run', status: 'live', count: flagged.length, countLabel: 'flagged this run' },
    { key: 'guide', name: 'GUIDE', job: 'Go-live → 3 WAO categories', data: 'WAO categories per operator', status: 'live', count: mix.stuckAtTwo.length, countLabel: 'one category short' },
    { key: 'tickets', name: 'TICKETS', job: 'Catches sales falling behind', data: 'tickets per week · YoY', status: 'live', count: zeroTicketIds.length, countLabel: 'no tickets in 2 weeks' },
    { key: 'season', name: 'SEASON', job: 'High-season readiness check', data: 'route prices · cutoff', status: 'phase2', count: null, countLabel: null },
    { key: 'coach', name: 'COACH', job: 'Next feature that fits, VAS leads to sales', data: 'feature usage · Distribution/Fleet gaps', status: 'phase2', count: null, countLabel: null },
    { key: 'briefer', name: 'BRIEFER', job: 'Call brief + quarterly review', data: 'HubSpot meetings · 90-day numbers', status: 'phase3', count: null, countLabel: null },
    { key: 'advocate', name: 'ADVOCATE', job: 'Drafts the referral ask when earned', data: 'WAO streak · tickets up', status: 'phase3', count: null, countLabel: null },
    { key: 'voice', name: 'VOICE', job: 'Monthly feedback brief for product', data: 'needs HubSpot conversations', status: 'needs_data', count: null, countLabel: null },
  ];

  return {
    run: run ? { label: run.label, status: run.status, trigger: run.trigger, agent: run.agent, startedAt: run.startedAt, completedAt: run.completedAt } : null,
    kpis: {
      scanned: inRun.length || views.length,
      flagged: flagged.length,
      filtered: Math.max((inRun.length || views.length) - flagged.length, 0),
      pending: pending.length,
      approved: count('approved'),
      closed: count('closed'),
      rejected: count('rejected'),
      hold: count('hold'),
      sentTotal: sentCount,
    },
    wao: { week: mix.week, active: waoActive, withUsage },
    agents,
    queue,
    milestones: {
      week: mix.week,
      buckets: [1, 2, 3, 4, 5, 6, 7].map((n) => ({ categories: n, operators: mix.byCategories[n] ?? 0 })),
      stuckAtTwo: mix.stuckAtTwo.slice(0, 50),
    },
    log: events.map((e) => ({ id: e.id, at: e.at, kind: e.kind, origin: e.origin, accountId: e.operatorId, name: e.name, text: e.text })),
  };
}

export type EngineOverview = ReturnType<typeof engineOverview>;
