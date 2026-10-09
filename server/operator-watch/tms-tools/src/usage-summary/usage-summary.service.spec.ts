import { BadRequestException } from '@nestjs/common';
import { UsageSummaryService } from './usage-summary.service';

describe('UsageSummaryService', () => {
  it('rejects inverted date ranges before reaching the repository', async () => {
    const repository = { findSummary: jest.fn() };
    const service = new UsageSummaryService(repository);
    try {
      service.getSummary(new Date('2026-02-01'), new Date('2026-01-01'));
      throw new Error('expected a bad request');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getStatus()).toBe(400);
    }
    expect(repository.findSummary).not.toHaveBeenCalled();
  });

  it('passes a valid request to the read-only repository boundary', async () => {
    const rows = [{ metric: 'requests', count: 2 }];
    const repository = { findSummary: jest.fn().mockResolvedValue(rows) };
    const service = new UsageSummaryService(repository);
    await expect(service.getSummary(new Date('2026-01-01'), new Date('2026-02-01'), 10)).resolves.toEqual(rows);
    expect(repository.findSummary).toHaveBeenCalledWith(new Date('2026-01-01'), new Date('2026-02-01'), 10);
  });
});
