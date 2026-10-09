import { Controller, Get, Headers, HttpCode, Post, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ClaudeRunWorker } from '../../infrastructure/claude/claude-run.worker';
import { RunService } from '../../domain/workspace/services/run.service';
import { SendingService } from '../../domain/workspace/services/sending.service';
import { agentAuthorized } from '../agent/mcp.controller';

/**
 * One scheduler beat, for hosts without long-lived processes (Vercel): opens the configured daily/weekly run when it is
 * due, sends whatever the send queue has due — the work WorkspaceWorkers does on timers in a long-running server — and
 * works off queued Claude assessments.
 * Called every minute by Supabase pg_cron (POST) or Vercel Cron (GET) with `Authorization: Bearer <CRON_SECRET>`.
 * Safe to call more often or from several callers: the run's period key and the send queue's claim prevent doubles.
 */
@Controller('internal')
export class InternalController {
  constructor(
    private readonly runs: RunService,
    private readonly sending: SendingService,
    private readonly agent: ClaudeRunWorker,
  ) {}

  @Get('tick')
  getTick(@Headers('authorization') authorization?: string) {
    return this.tick(authorization);
  }

  @Post('tick')
  @HttpCode(200)
  postTick(@Headers('authorization') authorization?: string) {
    return this.tick(authorization);
  }

  private async tick(authorization?: string) {
    if (!process.env.CRON_SECRET) throw new ServiceUnavailableException('CRON_SECRET is not set');
    if (!agentAuthorized(authorization, process.env.CRON_SECRET)) throw new UnauthorizedException();
    const run = await this.runs.tick();
    const sent = await this.sending.processDue();
    const agent = await this.agent.processDue();
    return { run: run?.id ?? null, sent, agent };
  }
}
