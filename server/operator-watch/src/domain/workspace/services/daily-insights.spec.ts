import { DailyRecord } from '../types/repositories/workspace.ports';
import { dailyOverview, operatorTimeline } from './daily-insights';

const row = (day: string, id: number, name: string, logins: number, actions: number, features: Record<string, number> = {}): DailyRecord => ({
  day,
  operatorId: id,
  operatorName: name,
  nameKey: name.toLowerCase(),
  accountId: `acc${id}`,
  logins,
  sessions: logins,
  country: 'Thailand',
  inBase: true,
  actions,
  categories: actions ? ['trip_management'] : [],
  features,
});

// 2026-11-21 is a Saturday; the baseline is the 14 days before it.
const days = Array.from({ length: 14 }, (_, i) => new Date(Date.UTC(2026, 10, 7 + i)).toISOString().slice(0, 10)); // 7..20 Nov
const history = [
  ...days.map((d) => row(d, 1, 'Alpha', 2, 100, { bl: 60 })),
  ...days.map((d) => row(d, 2, 'Beta', 1, 80, { bl: 40 })),
  ...days.map((d) => row(d, 3, 'Gamma', 0, 0)), // never logs in: not news when silent
];

describe('daily overview', () => {
  it('flags operators that normally log in but did not, and big drops', () => {
    const target = '2026-11-21';
    const rows = [...history, row(target, 1, 'Alpha', 1, 30, { bl: 10 }), row(target, 3, 'Gamma', 0, 0)];
    const o = dailyOverview(rows, target, (c) => c.toUpperCase());
    expect(o.no_login_but_usually_do).toEqual([expect.objectContaining({ operator: 'Beta', usually_logs_in_days_of_last_14: 14 })]);
    expect(o.activity_dropped_at_least_half).toEqual([expect.objectContaining({ operator: 'Alpha', actions: 30, typical_actions: 100, change_pct: -70 })]);
    expect(o.operators_that_logged_in).toBe(1);
  });

  it('gives one operator a timeline and counts the quiet streak', () => {
    const rows = [...history, row('2026-11-21', 2, 'Beta', 0, 0), row('2026-11-22', 2, 'Beta', 0, 0)];
    const t = operatorTimeline(rows, 'acc2', '2026-11-22', 4);
    expect(t.days_without_login_in_a_row_up_to_that_day).toBe(2);
    expect(t.timeline).toHaveLength(4);
  });
});
