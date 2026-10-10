import { BadRequestException, Body, Controller, Get, HttpCode, Inject, Post, Put, Query, Req, UseFilters, UseGuards } from '@nestjs/common';
import { AUTH_REPOSITORY, AuthRepository } from '../../auth/auth.repository';
import { AuthenticatedUser, RbacGuard, RequirePermission, SessionGuard } from '../../auth/guards';
import { SEND_CHANNELS, SendChannel } from '../../domain/workspace/entities/workspace.entities';
import { RunService } from '../../domain/workspace/services/run.service';
import { SendingService } from '../../domain/workspace/services/sending.service';
import { SettingsService } from '../../domain/workspace/services/workspace.shared';
import { WORKSPACE_STORE, WorkspaceStore } from '../../domain/workspace/types/repositories/workspace.ports';
import { ClaudeRunWorker } from '../../infrastructure/claude/claude-run.worker';
import { crmSourceMode } from '../../infrastructure/hubspot/hubspot.config';
import { background } from '../../infrastructure/runtime/background';
import { JsonRequestGuard } from '../workspace/dto/requests/workspace.validation';
import { WorkspaceErrorFilter } from '../workspace/controllers/workspace-error.filter';

interface AuthedRequest { user?: AuthenticatedUser }

/** Admin-only configuration and pipeline control. Secrets are reported as present/absent, never returned. */
@Controller('admin')
@UseGuards(SessionGuard, RbacGuard, JsonRequestGuard)
@RequirePermission('admin:settings')
@UseFilters(WorkspaceErrorFilter)
export class AdminController {
  constructor(
    private readonly settings: SettingsService,
    private readonly runs: RunService,
    private readonly sending: SendingService,
    @Inject(WORKSPACE_STORE) private readonly store: WorkspaceStore,
    @Inject(AUTH_REPOSITORY) private readonly users: AuthRepository,
    private readonly agent: ClaudeRunWorker,
  ) {}

  @Get('settings')
  async getSettings() {
    return { settings: await this.settings.get(), server: this.serverStatus() };
  }

  @Put('settings')
  async putSettings(@Body() body: unknown, @Req() req: AuthedRequest) {
    const who = this.who(req);
    const settings = await this.settings.save((body as { settings?: unknown })?.settings ?? body, who);
    if (req.user) await this.users.audit(req.user.id, 'admin.settings_updated');
    return { settings, server: this.serverStatus() };
  }

  @Get('runs')
  async listRuns(@Query('limit') limit?: string) {
    const runs = await this.store.listRuns(Math.min(Math.max(Number(limit) || 20, 1), 100));
    return {
      items: await Promise.all(
        runs.map(async (r) => {
          const cases = await this.store.casesForRun(r.id);
          return { ...r, cases: cases.length, outreach: cases.filter((c) => c.outcome === 'outreach').length };
        }),
      ),
    };
  }

  /** "Run now": opens a manual run immediately (independent of the schedule). */
  @Post('runs')
  @HttpCode(200)
  async startRun(@Req() req: AuthedRequest) {
    const run = await this.runs.startRun('manual', this.who(req));
    if (req.user) await this.users.audit(req.user.id, 'admin.run_started');
    // Claude runs are queued; start on them now rather than at the next scheduler tick.
    if (run?.agent === 'claude') background('Claude run', this.agent.processDue());
    return { run };
  }

  @Post('sending/test')
  @HttpCode(200)
  async testEmail(@Body() body: { channel?: string; to?: string }) {
    const channel = body?.channel as SendChannel;
    if (!SEND_CHANNELS.includes(channel)) throw new BadRequestException('channel must be smtp or hubspot');
    if (typeof body.to !== 'string' || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(body.to)) throw new BadRequestException('to must be an email address');
    try {
      return { ok: true, ...(await this.sending.sendTest(channel, body.to)) };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /** "Verify connection": connects and authenticates to the SMTP server without sending mail. */
  @Post('sending/verify')
  @HttpCode(200)
  async verifySending() {
    return this.sending.verify('smtp');
  }

  /** What the server has configured via env — booleans only. */
  private serverStatus() {
    const channels = this.sending.channelStatus();
    return {
      crmSource: crmSourceMode(),
      database: !!process.env.DATABASE_URL,
      hermesWebhookSecret: !!process.env.HERMES_WEBHOOK_SECRET,
      agentApiToken: !!process.env.AGENT_API_TOKEN,
      weeklyIngestToken: !!process.env.WEEKLY_INGEST_TOKEN,
      hermesApi: !!process.env.HERMES_API_URL && !!process.env.HERMES_API_KEY,
      claude: !!process.env.ANTHROPIC_API_KEY,
      seatosTools: !!process.env.TMS_TOOLS_MCP_URL,
      smtp: channels.smtp.configured,
      smtpVerified: channels.smtp.verification ? channels.smtp.verification.ok : null,
      smtpError: channels.smtp.verification?.error ?? null,
      hubspotSending: channels.hubspot.configured,
      // In-process timers, or (on Vercel) the cron tick that does the same work.
      workers: process.env.WORKSPACE_WORKERS !== 'false' || !!process.env.CRON_SECRET,
    };
  }

  private who(req: AuthedRequest): string {
    return req.user?.email ?? req.user?.id ?? 'unknown';
  }
}
