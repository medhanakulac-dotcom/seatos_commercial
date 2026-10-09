import { Controller, Get, Param, Query, UseGuards, Inject } from '@nestjs/common';
import { RbacGuard, RequirePermission, SessionGuard } from '../../../auth/guards';
import { REPORTING_SERVICE, ReportingService } from '../../../domain/reporting/services/reporting.service';
import { ReportingDateRange, ReportingDateRangePipe, ReportingOperatorIdPipe } from '../dto/requests/reporting.validation';
@Controller('reporting') @UseGuards(SessionGuard, RbacGuard) @RequirePermission('dashboard:read')
export class ReportingController {
  constructor(@Inject(REPORTING_SERVICE) private readonly reporting: ReportingService) {}
  @Get('accounts/:operatorId') accounts(@Param('operatorId', ReportingOperatorIdPipe) operatorId: string) { return this.reporting.accounts(operatorId); }
  @Get('usage/:operatorId') usage(@Param('operatorId', ReportingOperatorIdPipe) operatorId: string, @Query(ReportingDateRangePipe) range: ReportingDateRange) { return this.reporting.usage(operatorId, range.start, range.end); }
  @Get('tms/:operatorId') tmsSummary(@Param('operatorId', ReportingOperatorIdPipe) operatorId: string, @Query(ReportingDateRangePipe) range: ReportingDateRange) { return this.reporting.tmsSummary(operatorId, range.start, range.end); }
}
