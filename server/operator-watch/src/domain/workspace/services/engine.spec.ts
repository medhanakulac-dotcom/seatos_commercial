import type { RunRecord } from '../entities/workspace.entities';
import { engineOverview, type EngineInput } from './engine';
import type { AccountView } from './workspace.service';

const run = { id: 'r1', label: 'W47', status: 'completed', trigger: 'schedule', agent: 'claude', startedAt: '2026-11-22T19:00:00Z', completedAt: '2026-11-22T19:04:00Z' } as RunRecord;

const view = (id: string, outcome: 'outreach' | 'no_action', state: string, priority = 5, runId = 'r1'): AccountView =>
  ({
    account: { id, name: `Op ${id}`, owner: 'Ann' },
    case: { runId, outcome, state, playType: 'Retention' },
    health: 'Unhealthy',
    playbook: { name: 'Rescue', description: '' },
    priority,
    summary: `summary ${id}`,
    signals: [{ detector: 'd', code: 'c', text: `signal ${id}` }],
    drafted: true,
  }) as unknown as AccountView;

const base = (over: Partial<EngineInput> = {}): EngineInput => ({
  run,
  views: [],
  events: [],
  mix: { week: '2026-11-16', byCategories: [0, 10, 47, 20, 10, 5, 3, 1], stuckAtTwo: [] },
  zeroTicketIds: [],
  sentCount: 0,
  ...over,
});

describe('engineOverview', () => {
  it('counts what the run read, flagged and left pending', () => {
    const views = [
      view('a', 'outreach', 'pending', 3),
      view('b', 'outreach', 'pending', 1),
      view('c', 'outreach', 'approved'),
      view('d', 'outreach', 'rejected'),
      view('e', 'no_action', 'no_action'),
      view('f', 'no_action', 'no_action'),
      view('old', 'outreach', 'pending', 0, 'r0'), // a case from an older run is not this run's work
    ];
    const o = engineOverview(base({ views, sentCount: 12 }));
    expect(o.kpis).toMatchObject({ scanned: 6, flagged: 4, filtered: 2, pending: 2, approved: 1, rejected: 1, sentTotal: 12 });
    expect(o.queue.map((q) => q.accountId)).toEqual(['b', 'a']); // highest priority (lowest number) first
    expect(o.queue[0].signals).toEqual(['signal b']);
  });

  it('reads WAO and the category mix from the latest usage week', () => {
    const o = engineOverview(base({ mix: { week: '2026-11-16', byCategories: [0, 10, 47, 20, 10, 5, 3, 1], stuckAtTwo: [{ accountId: 'x', name: 'X' }] } }));
    expect(o.wao).toEqual({ week: '2026-11-16', active: 39, withUsage: 96 });
    expect(o.milestones.buckets[1]).toEqual({ categories: 2, operators: 47 });
    expect(o.agents.find((a) => a.key === 'guide')?.count).toBe(1);
  });

  it('lists 8 agents and only live ones carry a count', () => {
    const o = engineOverview(base({ zeroTicketIds: ['p', 'q'] }));
    expect(o.agents).toHaveLength(8);
    expect(o.agents.filter((a) => a.count !== null).map((a) => a.key)).toEqual(['scout', 'guide', 'tickets']);
    expect(o.agents.find((a) => a.key === 'tickets')?.count).toBe(2);
  });

  it('works before the first run', () => {
    const o = engineOverview(base({ run: undefined, views: [view('a', 'outreach', 'pending')] }));
    expect(o.run).toBeNull();
    expect(o.kpis.flagged).toBe(0);
    expect(o.kpis.scanned).toBe(1);
  });
});
