import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health/health.controller';
import { UsageSummaryModule } from './usage-summary/usage-summary.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), UsageSummaryModule],
  controllers: [HealthController],
})
export class AppModule {}
