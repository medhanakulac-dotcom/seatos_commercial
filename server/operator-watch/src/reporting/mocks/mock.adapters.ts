import { Injectable } from '@nestjs/common';
import { AnalyticsPort, CrmAccount, HubSpotPort, TmsPort, TmsUsageSummary, UsageEvent } from '../contracts';

const ACCOUNTS: readonly CrmAccount[] = [
  { operatorId: 'operator-1', name: 'Bangkok Express', segment: 'high', health: 'healthy' },
  { operatorId: 'operator-2', name: 'Island Transit', segment: 'mid', health: 'adopted' },
];

const EVENTS: readonly UsageEvent[] = [
  { operatorId: 'operator-1', eventName: 'export_clicked', occurredAt: '2026-01-15T10:00:00.000Z', utm: { source: 'newsletter', campaign: 'q1-launch' }, properties: { export_type: 'csv', filters_applied: true } },
];

@Injectable()
export class MockHubSpotAdapter implements HubSpotPort {
  async listAccounts(operatorId: string): Promise<readonly CrmAccount[]> { return ACCOUNTS.filter((a) => a.operatorId === operatorId); }
}

@Injectable()
export class MockAnalyticsAdapter implements AnalyticsPort {
  async usageByOperator(operatorId: string, start: string, end: string): Promise<readonly UsageEvent[]> {
    return EVENTS.filter((e) => e.operatorId === operatorId && e.occurredAt >= start && e.occurredAt <= end);
  }
}

@Injectable()
export class MockTmsAdapter implements TmsPort {
  async usageSummary(operatorId: string, start: string, end: string): Promise<TmsUsageSummary> {
    return { operatorId, periodStart: start, periodEnd: end, bookings: operatorId === 'operator-1' ? 42 : 0, completedTrips: operatorId === 'operator-1' ? 38 : 0, passengers: operatorId === 'operator-1' ? 91 : 0 };
  }
}
