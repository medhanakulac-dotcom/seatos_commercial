import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, UseFilters, UseGuards } from '@nestjs/common';
import { displayNameOf } from '../../../auth/display-name';
import { AuthenticatedUser, RbacGuard, RequirePermission, SessionGuard } from '../../../auth/guards';
import { Actor, HEALTHS, Language, RewriteMode } from '../../../domain/workspace/entities/workspace.entities';
import { DORMANT_PLAYBOOK, PLAYBOOK_MATRIX } from '../../../domain/workspace/services/playbook.rules';
import { WeeklyDataService } from '../../../domain/workspace/services/weekly-data.service';
import { WorkspaceService } from '../../../domain/workspace/services/workspace.service';
import { LANGUAGE_NAMES } from '../../../domain/workspace/services/workspace.shared';
import {
  AccountIdPipe,
  AssistantBodyPipe,
  AssistantRequest,
  BulkApproveBodyPipe,
  BulkApproveRequest,
  DecisionBodyPipe,
  DecisionRequest,
  InstructionBodyPipe,
  JsonRequestGuard,
  LanguageBodyPipe,
  NoteBodyPipe,
  RewriteBodyPipe,
  TmsLinkBodyPipe,
} from '../dto/requests/workspace.validation';
import { toAccountDetail, toAccountSummary, toEvent, toSendJob } from '../dto/responses/workspace.responses';
import { WorkspaceErrorFilter } from './workspace-error.filter';

interface AuthedRequest { user?: AuthenticatedUser }

/** Workspace API: the only data path for the Commercial Workspace UI. */
@Controller('workspace')
@UseGuards(SessionGuard, RbacGuard, JsonRequestGuard)
@RequirePermission('workspace:read')
@UseFilters(WorkspaceErrorFilter)
export class WorkspaceController {
  constructor(
    private readonly workspace: WorkspaceService,
    private readonly weeklyData: WeeklyDataService,
  ) {}

  @Get('meta')
  async meta() {
    await this.workspace.ready();
    const { run, previous, snapshot, settings, sending } = await this.workspace.meta();
    return {
      week: { current: run?.label ?? '—', previous: previous?.label ?? '—' },
      run: run ? { id: run.id, label: run.label, status: run.status, trigger: run.trigger, agent: run.agent, startedAt: run.startedAt, completedAt: run.completedAt, summary: run.summary, error: run.error } : null,
      source: { kind: snapshot.meta.kind, portal: snapshot.meta.portal, pulledAt: snapshot.pulledAt.slice(0, 10), description: snapshot.meta.description, accountCount: snapshot.accounts.length },
      capabilities: this.workspace.capabilities,
      sending,
      agent: { mode: settings.agent.mode },
      languages: LANGUAGE_NAMES,
      playbooks: { matrix: PLAYBOOK_MATRIX, dormant: DORMANT_PLAYBOOK, healths: HEALTHS },
    };
  }

  @Get('accounts')
  async accounts() {
    await this.workspace.ready();
    return { items: (await this.workspace.list()).map(toAccountSummary) };
  }

  @Get('accounts/:id')
  async account(@Param('id', AccountIdPipe) id: string) {
    await this.workspace.ready();
    return toAccountDetail(await this.workspace.get(id));
  }

  @Get('activity')
  async activity(@Query('limit') limit?: string) {
    const n = Math.min(Math.max(Number(limit) || 6, 1), 50);
    return { items: (await this.workspace.activity(n)).map((e) => ({ accountId: e.operatorId, name: e.name, ...toEvent(e) })) };
  }

  @Get('sent')
  async sent() {
    const { jobs, cases, sentCount, sending } = await this.workspace.sent();
    return {
      items: jobs.map((j) => {
        const c = cases.get(j.caseId);
        return { ...toSendJob(j), accountId: c?.operatorId ?? '', name: c?.operatorName ?? '—', caseId: c?.caseRef ?? '—', playbook: c?.playbook ?? null };
      }),
      sentCount,
      sending,
    };
  }

  @Get('leader')
  leader() {
    return this.workspace.leader();
  }

  @Post('accounts/:id/draft')
  @HttpCode(200)
  @RequirePermission('workspace:review')
  async generate(@Param('id', AccountIdPipe) id: string, @Req() req: AuthedRequest) {
    await this.workspace.generateDraft(id, this.actor(req));
    return this.detail(id);
  }

  @Post('accounts/:id/draft/rewrite')
  @HttpCode(200)
  @RequirePermission('workspace:review')
  async rewrite(@Param('id', AccountIdPipe) id: string, @Body(RewriteBodyPipe) mode: RewriteMode, @Req() req: AuthedRequest) {
    await this.workspace.rewrite(id, mode, this.actor(req));
    return this.detail(id);
  }

  @Post('accounts/:id/draft/language')
  @HttpCode(200)
  @RequirePermission('workspace:review')
  async language(@Param('id', AccountIdPipe) id: string, @Body(LanguageBodyPipe) language: Language, @Req() req: AuthedRequest) {
    await this.workspace.changeLanguage(id, language, this.actor(req));
    return this.detail(id);
  }

  @Post('accounts/:id/draft/prompt')
  @HttpCode(200)
  @RequirePermission('workspace:review')
  async prompt(@Param('id', AccountIdPipe) id: string, @Body(InstructionBodyPipe) instruction: string, @Req() req: AuthedRequest) {
    const result = await this.workspace.rewriteWithPrompt(id, instruction, this.actor(req));
    return { ...result, account: await this.detail(id) };
  }

  @Post('accounts/:id/decision')
  @HttpCode(200)
  @RequirePermission('workspace:review')
  async decide(@Param('id', AccountIdPipe) id: string, @Body(DecisionBodyPipe) body: DecisionRequest, @Req() req: AuthedRequest) {
    await this.workspace.decide(id, body.decision, this.actor(req), body);
    return this.detail(id);
  }

  @Post('approvals/bulk')
  @HttpCode(200)
  @RequirePermission('workspace:review')
  bulk(@Body(BulkApproveBodyPipe) body: BulkApproveRequest, @Req() req: AuthedRequest) {
    return this.workspace.bulkApprove(body.playbook, body.owner, this.actor(req), body.channel);
  }

  @Post('accounts/:id/notes')
  @HttpCode(200)
  @RequirePermission('workspace:review')
  async note(@Param('id', AccountIdPipe) id: string, @Body(NoteBodyPipe) text: string, @Req() req: AuthedRequest) {
    const note = await this.workspace.addNote(id, text, this.actor(req));
    return { note: toEvent(note), account: await this.detail(id) };
  }

  @Post('accounts/:id/notes/:eventId/retry')
  @HttpCode(200)
  @RequirePermission('workspace:review')
  async retryNote(@Param('id', AccountIdPipe) id: string, @Param('eventId', AccountIdPipe) eventId: string, @Req() req: AuthedRequest) {
    const note = await this.workspace.retryNote(id, eventId, this.actor(req));
    return { note: toEvent(note), account: await this.detail(id) };
  }

  @Post('accounts/:id/tms-link')
  @HttpCode(200)
  @RequirePermission('workspace:review')
  async confirmTmsLink(@Param('id', AccountIdPipe) id: string, @Body(TmsLinkBodyPipe) tmsOperatorId: number, @Req() req: AuthedRequest) {
    await this.workspace.confirmTmsLink(id, tmsOperatorId, this.actor(req));
    return this.detail(id);
  }

  @Post('accounts/:id/tms-link/resolve')
  @HttpCode(200)
  @RequirePermission('workspace:review')
  async resolveTmsLink(@Param('id', AccountIdPipe) id: string) {
    await this.workspace.resolveTmsLink(id);
    return this.detail(id);
  }

  /** Uploaded weekly numbers for the account: feature usage (WAO) and tickets/GMV, newest week first. */
  @Get('accounts/:id/weekly')
  weekly(@Param('id', AccountIdPipe) id: string) {
    return this.weeklyData.forAccount(id);
  }

  /** Notes, meetings, calls, emails, tasks and logged messages from HubSpot, newest first. */
  @Get('accounts/:id/hubspot-activity')
  crmActivity(@Param('id', AccountIdPipe) id: string) {
    return this.workspace.crmActivityFor(id);
  }

  @Get('accounts/:id/assistant')
  conversation(@Param('id', AccountIdPipe) id: string) {
    return this.workspace.conversation(id);
  }

  @Post('accounts/:id/assistant')
  @HttpCode(200)
  ask(@Param('id', AccountIdPipe) id: string, @Body(AssistantBodyPipe) body: AssistantRequest, @Req() req: AuthedRequest) {
    return this.workspace.ask(id, body.question, this.actor(req));
  }

  private async detail(id: string) {
    return toAccountDetail(await this.workspace.get(id));
  }

  private actor(req: AuthedRequest): Actor {
    return { id: req.user?.id ?? 'unknown', name: req.user ? displayNameOf(req.user.email) : 'Unknown user' };
  }
}
