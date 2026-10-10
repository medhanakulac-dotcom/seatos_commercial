import { formatWeekly } from './claude.prompts';

const base = { usage: [], tickets: [{ week: '2026-10-05', tickets: 40 }] };

describe('formatWeekly price line', () => {
  it('says the comparison has not synced when it never ran', () => {
    expect(formatWeekly({ ...base, pricing: [], pricingSyncedAt: null })).toContain('has not synced from BigQuery yet');
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

  it('keeps the weekly note when there are no weeks yet', () => {
    expect(formatWeekly({ usage: [], tickets: [], pricing: [], pricingSyncedAt: null })).toContain('No weekly SeatOS numbers');
  });
});
