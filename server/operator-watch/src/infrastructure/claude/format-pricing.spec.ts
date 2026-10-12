import { formatWeekly } from './claude.prompts';

const base = { usage: [], tickets: [{ week: '2026-10-05', tickets: 40 }] };

describe('formatWeekly price line', () => {
  it('says the comparison has not synced when it never ran', () => {
    expect(formatWeekly({ ...base, pricing: [], pricingSyncedAt: null })).toContain('comparison is not available yet');
  });

  it('says why when it ran but nobody is comparable', () => {
    expect(formatWeekly({ ...base, pricing: [], pricingSyncedAt: '2026-10-10T00:00:00Z' })).toContain('cannot be compared');
  });

  it('quotes the figure with its evidence', () => {
    const text = formatWeekly({
      ...base,
      pricingSyncedAt: '2026-10-10T00:00:00Z',
      pricing: [
        {
          operatorName: 'X', nameKey: 'x', accountId: 'D-1', operatorId: 1, currency: 'THB', ticketsCompared: 120, segments: 4, pricePct: 7.5, windowDays: 90, computedAt: '2026-10-10T00:00:00Z',
          detail: [{ from: 'Krabi', to: 'Phuket', vehicleType: 'minivan', vehicleClass: 'standard', tickets: 50, avgPrice: 400, peerAvgPrice: 360, peers: 2, pct: 11.1 }],
        },
      ],
    });
    expect(text).toContain('+7.5% across 4 segments, 120 tickets compared');
    expect(text).toContain('Krabi→Phuket minivan/standard: 400 vs 360 THB (+11.1%, 50 tickets)');
  });

  it('compares the cut-off with the market, or says why it cannot', () => {
    const text = formatWeekly({
      ...base,
      cutoffSyncedAt: '2026-10-10T00:00:00Z',
      cutoff: [
        {
          operatorName: 'X', nameKey: 'x', accountId: 'D-1', operatorId: 1, bookingsCompared: 80, segments: 2, ownAvgHours: 3, marketAvgHours: 1.5, windowDays: 30, computedAt: '2026-10-10T00:00:00Z',
          detail: [{ from: 'Krabi', to: 'Phuket', vehicleType: 'minivan', vehicleClass: 'standard', bookings: 50, avgHours: 3, peerAvgHours: 1.5, peers: 2 }],
        },
      ],
    });
    expect(text).toContain('own average 3h before departure vs market 1.5h: 1.5h earlier than the market');
    expect(text).toContain('Krabi→Phuket minivan/standard: 3h vs 1.5h (50 bookings)');
    expect(formatWeekly({ ...base, cutoff: [], cutoffSyncedAt: '2026-10-10T00:00:00Z' })).toContain('booking cut-off vs other operators: cannot be compared');
    expect(formatWeekly({ ...base, cutoff: [], cutoffSyncedAt: null })).not.toContain('cut-off');
  });

  it('compares tickets with the same weeks a year earlier when both years were delivered', () => {
    const weeks = Array.from({ length: 70 }, (_, i) => new Date(Date.parse('2025-06-02T12:00:00Z') + i * 7 * 86_400_000).toISOString().slice(0, 10));
    const tickets = weeks.map((week) => ({ week, tickets: week >= '2026-06-01' ? 30 : 10 }));
    const text = formatWeekly({ usage: [], tickets, ticketWeeks: weeks });
    expect(text).toMatch(/tickets, last 4 weeks up to \d{4}-\d{2}-\d{2} vs the same weeks a year earlier: 120 vs 40 \(\+200%\)/);
    expect(formatWeekly({ usage: [], tickets: base.tickets, ticketWeeks: ['2026-10-05'] })).not.toContain('year earlier');
  });

  it('keeps the weekly note when there are no weeks yet', () => {
    expect(formatWeekly({ usage: [], tickets: [], pricing: [], pricingSyncedAt: null })).toContain('No weekly SeatOS numbers');
  });
});
