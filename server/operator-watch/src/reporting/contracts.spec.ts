import { AnalyticsPort, HubSpotPort, TmsPort } from './contracts';

describe('reporting contracts', () => {
  it('are implementable by async source adapters', () => {
    const hubSpot: HubSpotPort = { listAccounts: async () => [] };
    const analytics: AnalyticsPort = { usageByOperator: async () => [] };
    const tms: TmsPort = { usageSummary: async (operatorId, start, end) => ({ operatorId, periodStart: start, periodEnd: end, bookings: 0, completedTrips: 0, passengers: 0 }) };
    expect(hubSpot.listAccounts('x')).toBeInstanceOf(Promise);
    expect(analytics.usageByOperator('x', 'a', 'b')).toBeInstanceOf(Promise);
    expect(tms.usageSummary('x', 'a', 'b')).toBeInstanceOf(Promise);
  });
});
