import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { UsageSummaryRequest } from './dto/usage-summary.request';
import { ServiceTokenGuard } from './guards/service-token.guard';
import { UsageSummaryService } from './usage-summary.service';

@Controller('v1/internal/usage-summary')
@UseGuards(ServiceTokenGuard)
export class UsageSummaryController {
  constructor(private readonly service: UsageSummaryService) {}

  @Post()
  summary(@Body() request: UsageSummaryRequest) {
    return this.service.getSummary(
      new Date(request.from),
      new Date(request.to),
      request.limit ?? 100,
    );
  }
}
