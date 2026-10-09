import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { USAGE_SUMMARY_REPOSITORY, UsageSummaryRepository } from './ports/usage-summary.repository';

@Injectable()
export class UsageSummaryService {
  constructor(
    @Inject(USAGE_SUMMARY_REPOSITORY)
    private readonly repository: UsageSummaryRepository,
  ) {}

  getSummary(from: Date, to: Date, limit = 100) {
    if (from > to) throw new BadRequestException('from must be before or equal to to');
    return this.repository.findSummary(from, to, limit);
  }
}
