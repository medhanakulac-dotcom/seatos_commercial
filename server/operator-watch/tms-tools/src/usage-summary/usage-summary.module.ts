import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServiceTokenGuard } from './guards/service-token.guard';
import { USAGE_SUMMARY_REPOSITORY, UsageSummaryRepository } from './ports/usage-summary.repository';
import { MySqlUsageSummaryRepository } from './repositories/mysql-usage-summary.repository';
import { UsageSummaryController } from './usage-summary.controller';
import { UsageSummaryService } from './usage-summary.service';

const mockRepository: UsageSummaryRepository = { findSummary: async () => [] };

@Module({
  imports: [ConfigModule],
  controllers: [UsageSummaryController],
  providers: [
    UsageSummaryService,
    ServiceTokenGuard,
    {
      provide: USAGE_SUMMARY_REPOSITORY,
      inject: [ConfigService],
      useFactory: (config: ConfigService): UsageSummaryRepository => {
        const mode = config.get<string>('SERVICE_TOKEN_MODE', 'production');
        const nodeEnv = config.get<string>('NODE_ENV', process.env.NODE_ENV ?? 'production');
        if (mode === 'mock' && (nodeEnv === 'test' || nodeEnv === 'development')) return mockRepository;
        return new MySqlUsageSummaryRepository(config);
      },
    },
  ],
})
export class UsageSummaryModule {}
