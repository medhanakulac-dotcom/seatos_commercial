import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MockAnalyticsAdapter, MockHubSpotAdapter, MockTmsAdapter } from './mocks/mock.adapters';
import { ANALYTICS_PORT as LEGACY_ANALYTICS_PORT, HUBSPOT_PORT as LEGACY_HUBSPOT_PORT, TMS_PORT as LEGACY_TMS_PORT } from './reporting.tokens';
import { ReportingController as LegacyReportingController } from '../reporting/reporting.controller';
import { ReportingService as LegacyReportingService } from '../reporting/reporting.service';
import { ReportingController } from '../application/reporting/controllers/reporting.controller';
import { ReportingService, REPORTING_SERVICE } from '../domain/reporting/services/reporting.service';
import { ANALYTICS_PORT, HUBSPOT_PORT, TMS_PORT } from '../domain/reporting/types/repositories/reporting.ports';
@Module({ imports: [AuthModule], controllers: [ReportingController], providers: [
  ReportingService, { provide: REPORTING_SERVICE, useExisting: ReportingService },
  MockHubSpotAdapter, MockAnalyticsAdapter, MockTmsAdapter,
  { provide: HUBSPOT_PORT, useExisting: MockHubSpotAdapter }, { provide: ANALYTICS_PORT, useExisting: MockAnalyticsAdapter }, { provide: TMS_PORT, useExisting: MockTmsAdapter }, { provide: LEGACY_HUBSPOT_PORT, useExisting: MockHubSpotAdapter }, { provide: LEGACY_ANALYTICS_PORT, useExisting: MockAnalyticsAdapter }, { provide: LEGACY_TMS_PORT, useExisting: MockTmsAdapter },
  LegacyReportingController, LegacyReportingService,
], exports: [REPORTING_SERVICE, ReportingService, LegacyReportingService] })
export class ReportingModule {}
