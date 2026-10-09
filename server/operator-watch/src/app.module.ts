import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { ReportingModule } from './reporting/reporting.module';
import { AuthModule } from './auth/auth.module';
import { WorkspaceModule } from './application/workspace/workspace.module';

@Module({
  imports: [ReportingModule, AuthModule, WorkspaceModule],
  controllers: [HealthController],
})
export class AppModule {}
