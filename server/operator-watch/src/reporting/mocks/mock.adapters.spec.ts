import { MockAnalyticsAdapter, MockHubSpotAdapter, MockTmsAdapter } from './mock.adapters';

describe('deterministic reporting adapters', () => {
  it('returns stable filtered CRM and analytics fixtures', async () => {
    await expect(new MockHubSpotAdapter().listAccounts('operator-1')).resolves.toHaveLength(1);
    await expect(new MockAnalyticsAdapter().usageByOperator('operator-1', '2026-01-01', '2026-01-31')).resolves.toEqual([
      expect.objectContaining({ eventName: 'export_clicked' }),
    ]);
  });

  it('returns stable TMS summary', async () => {
    await expect(new MockTmsAdapter().usageSummary('operator-1', '2026-01-01', '2026-01-31')).resolves.toMatchObject({ bookings: 42, completedTrips: 38, passengers: 91 });
  });
});
