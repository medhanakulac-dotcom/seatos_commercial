import { describe, expect, it } from 'vitest';
import { mondayOf, pctChange, shiftWeeks, ticketsPeriods, yearAgo } from './ticketsYoY';

const weeksFrom = (start: string, n: number) => Array.from({ length: n }, (_, i) => shiftWeeks(start, i));

describe('tickets year on year', () => {
  it('goes back 52 weeks and stays on a Monday', () => {
    expect(yearAgo('2026-10-05')).toBe('2025-10-06');
    expect(mondayOf(new Date('2026-10-11T10:00:00Z'))).toBe('2026-10-05');
  });

  it('rounds the change and has none against zero', () => {
    expect(pctChange(120, 100)).toBe(20);
    expect(pctChange(5, 0)).toBeNull();
  });

  it('compares finished weeks with the same weeks last year, only when both years are covered', () => {
    const delivered = weeksFrom('2025-09-01', 62); // up to 2026-10-26
    const tickets = delivered.map((w) => ({ week: w, tickets: w >= '2026-01-01' ? 20 : 10 }));
    const now = new Date('2026-10-14T00:00:00Z'); // week of 2026-10-12 is still running
    const p = ticketsPeriods(tickets, delivered.filter((w) => w <= '2026-10-12'), now);
    expect(p.map((x) => x.weeks)).toEqual([4]); // 13 weeks would need data from before 2025-09
    expect(p[0]).toMatchObject({ to: '2026-10-05', tickets: 80, lastYear: 40, pct: 100 });
  });

  it('says nothing without a year of history', () => {
    const delivered = weeksFrom('2026-09-01', 6);
    expect(ticketsPeriods([], delivered, new Date('2026-10-14T00:00:00Z'))).toEqual([]);
  });
});
