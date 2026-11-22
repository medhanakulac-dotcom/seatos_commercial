import { DailyRecord } from '../types/repositories/workspace.ports';
import { dailyReport } from './daily-report';

const row = (day: string, id: number, country: string, categories: string[], sessions = 1): DailyRecord => ({
  day,
  operatorId: id,
  operatorName: `Op${id}`,
  nameKey: `op${id}`,
  accountId: `a${id}`,
  logins: 1,
  sessions,
  country,
  inBase: true,
  actions: categories.length * 5,
  categories,
  features: {},
});

const cats = (n: number) => ['inventory_management', 'distribution_management', 'reservation_management', 'trip_management'].slice(0, n);
const days = (from: string, to: string) => {
  const out: string[] = [];
  for (let d = new Date(`${from}T00:00:00Z`); d <= new Date(`${to}T00:00:00Z`); d = new Date(d.getTime() + 86_400_000)) out.push(d.toISOString().slice(0, 10));
  return out;
};

describe('daily report', () => {
  it('computes rolling 7-day WAO against the pre-launch week and who crossed in', () => {
    const rows: DailyRecord[] = [];
    for (const d of days('2026-11-09', '2026-11-21')) {
      rows.push(row(d, 1, 'Thailand', cats(3))); // always WAO
      rows.push(row(d, 2, 'Thailand', cats(1))); // never
      rows.push(row(d, 3, 'Laos', d < '2026-11-21' ? cats(1) : cats(3))); // crosses on the 21st
    }
    const r = dailyReport(rows, '2026-11-21');
    expect(r.wao).toMatchObject({ operators: 2, base: 3, pct: 66.7, change_vs_week_ago_pp: 33.4 });
    expect(r.crossed_into_wao_that_day).toEqual(['Op3']);
    expect(r.slipped_below_wao_that_day).toEqual([]);
    expect(r.wao_by_country_last_7_days.find((c) => c.country === 'Laos')).toMatchObject({ wao_pct: 100 });
  });
});
