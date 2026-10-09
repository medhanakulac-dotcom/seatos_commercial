import { Inject, Injectable } from '@nestjs/common';
import { ANALYTICS_PORT, HUBSPOT_PORT, TMS_PORT, AnalyticsPort, HubSpotPort, TmsPort } from '../types/repositories/reporting.ports';
export const REPORTING_SERVICE = Symbol('REPORTING_SERVICE');
@Injectable()
export class ReportingService {
  constructor(@Inject(HUBSPOT_PORT) private readonly hubSpot: HubSpotPort, @Inject(ANALYTICS_PORT) private readonly analytics: AnalyticsPort, @Inject(TMS_PORT) private readonly tms: TmsPort) {}
  accounts(operatorId: string) { return this.hubSpot.listAccounts(operatorId); }
  usage(operatorId: string, start: string, end: string) { return this.analytics.usageByOperator(operatorId, start, end); }
  tmsSummary(operatorId: string, start: string, end: string) { return this.tms.usageSummary(operatorId, start, end); }
}
