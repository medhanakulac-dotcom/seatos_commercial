export const USAGE_SUMMARY_REPOSITORY = Symbol('USAGE_SUMMARY_REPOSITORY');

export interface UsageSummaryRepository {
  findSummary(from: Date, to: Date, limit: number): Promise<readonly UsageSummaryRow[]>;
}

export interface UsageSummaryRow {
  readonly metric: string;
  readonly count: number;
}
