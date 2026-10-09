import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

export interface ReportingDateRange {
  readonly start: string;
  readonly end: string;
}

function invalid(message: string): BadRequestException {
  return new BadRequestException(message);
}

function assertOperatorId(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw invalid('operatorId must be a non-empty string');
  }
  return value;
}

function parseDate(value: unknown, field: 'start' | 'end'): string {
  if (typeof value !== 'string' || value.trim().length === 0 || Number.isNaN(Date.parse(value))) {
    throw invalid(`${field} must be a valid date`);
  }
  return value;
}

@Injectable()
export class ReportingOperatorIdPipe implements PipeTransform<unknown, string> {
  transform(value: unknown): string {
    return assertOperatorId(value);
  }
}

@Injectable()
export class ReportingDateRangePipe implements PipeTransform<unknown, ReportingDateRange> {
  transform(value: unknown): ReportingDateRange {
    const query = (value ?? {}) as Record<string, unknown>;
    const start = parseDate(query.start, 'start');
    const end = parseDate(query.end, 'end');

    if (new Date(start).getTime() > new Date(end).getTime()) {
      throw invalid('start must be before or equal to end');
    }

    return { start, end };
  }
}
