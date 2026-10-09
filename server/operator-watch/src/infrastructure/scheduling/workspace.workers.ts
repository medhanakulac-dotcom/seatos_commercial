import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { RunService } from '../../domain/workspace/services/run.service';
import { SendingService } from '../../domain/workspace/services/sending.service';

const PIPELINE_TICK_MS = 60_000;
const SEND_TICK_MS = 30_000;

/**
 * In-process timers: the pipeline scheduler (opens the configured daily/weekly run once per period —
 * the unique period key keeps multiple instances from double-running) and the send-queue worker.
 * Disable with WORKSPACE_WORKERS=false (tests, or when an external orchestrator drives runs).
 */
@Injectable()
export class WorkspaceWorkers implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(WorkspaceWorkers.name);
  private timers: NodeJS.Timeout[] = [];

  constructor(
    private readonly runs: RunService,
    private readonly sending: SendingService,
  ) {}

  onApplicationBootstrap(): void {
    if (process.env.WORKSPACE_WORKERS === 'false') return;
    this.timers.push(setInterval(() => void this.safely('pipeline tick', () => this.runs.tick()), PIPELINE_TICK_MS));
    this.timers.push(setInterval(() => void this.safely('send worker', () => this.sending.processDue()), SEND_TICK_MS));
    this.logger.log('Pipeline scheduler and send worker started');
  }

  onModuleDestroy(): void {
    this.timers.forEach(clearInterval);
    this.timers = [];
  }

  private async safely(what: string, fn: () => Promise<unknown>): Promise<void> {
    try {
      await fn();
    } catch (error) {
      this.logger.error(`${what} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
