import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { RbacGuard, RequirePermission, SessionGuard } from '../auth/guards';
import { ReportingService } from './reporting.service';
import { ReportingDateRange, ReportingDateRangePipe, ReportingOperatorIdPipe } from './reporting.validation';
@Controller('reporting')
@UseGuards(SessionGuard, RbacGuard)
@RequirePermission('dashboard:read')
export class ReportingController {
  constructor(private readonly reporting: ReportingService) {}
  @Get('accounts/:operatorId') accounts(@Param('operatorId', ReportingOperatorIdPipe) operatorId: string) { return this.reporting.accounts(operatorId); }
  @Get('usage/:operatorId') usage(@Param('operatorId', ReportingOperatorIdPipe) operatorId: string, @Query(ReportingDateRangePipe) range: ReportingDateRange) { return this.reporting.usage(operatorId, range.start, range.end); }
  @Get('tms/:operatorId') tmsSummary(@Param('operatorId', ReportingOperatorIdPipe) operatorId: string, @Query(ReportingDateRangePipe) range: ReportingDateRange) { return this.reporting.tmsSummary(operatorId, range.start, range.end); }
}
