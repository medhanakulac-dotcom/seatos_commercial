import { BadRequestException, Body, Controller, Get, HttpCode, Post, Put, Req, UseFilters, UseGuards } from '@nestjs/common';
import { AuthenticatedUser, RbacGuard, RequirePermission, SessionGuard } from '../../auth/guards';
import { WeeklyDataService } from '../../domain/workspace/services/weekly-data.service';
import { WorkspaceErrorFilter } from '../workspace/controllers/workspace-error.filter';
import { JsonRequestGuard } from '../workspace/dto/requests/workspace.validation';

interface AuthedRequest { user?: AuthenticatedUser }

/** 2 MB of CSV is ~15k operators; anything larger is not one of these exports. */
const MAX_CSV = 2_000_000;

/** Weekly uploads (Settings → Weekly data): Looker usage table and tickets, plus hand-made name matches. */
@Controller('admin/weekly-data')
@UseGuards(SessionGuard, RbacGuard, JsonRequestGuard)
@RequirePermission('admin:settings')
@UseFilters(WorkspaceErrorFilter)
export class WeeklyDataController {
  constructor(private readonly weekly: WeeklyDataService) {}

  @Get()
  summary() {
    return this.weekly.summary();
  }

  /** `{ kind: 'usage' | 'tickets', csv, week? }` — week (YYYY-MM-DD, the Monday) only for tickets; default this week. */
  @Post()
  @HttpCode(200)
  upload(@Body() body: unknown, @Req() req: AuthedRequest) {
    const b = (body ?? {}) as Record<string, unknown>;
    if (b.kind !== 'usage' && b.kind !== 'tickets') throw new BadRequestException('kind must be usage or tickets');
    if (typeof b.csv !== 'string' || !b.csv.trim()) throw new BadRequestException('csv must be the file contents');
    if (b.csv.length > MAX_CSV) throw new BadRequestException('The file is too large');
    if (b.week !== undefined && (typeof b.week !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(b.week))) throw new BadRequestException('week must be YYYY-MM-DD');
    return this.weekly.upload(b.kind, b.csv, b.week as string | undefined, req.user?.email ?? 'unknown');
  }

  /** `{ name, accountId }` — accountId null marks the name as "not an operator we track". */
  @Put('links')
  async link(@Body() body: unknown, @Req() req: AuthedRequest) {
    const b = (body ?? {}) as Record<string, unknown>;
    if (typeof b.name !== 'string' || !b.name.trim() || b.name.length > 300) throw new BadRequestException('name is required');
    if (b.accountId !== null && (typeof b.accountId !== 'string' || !/^[\w-]{1,64}$/.test(b.accountId))) throw new BadRequestException('accountId must be an account id or null');
    await this.weekly.link(b.name, b.accountId, req.user?.email ?? 'unknown');
    return this.weekly.summary();
  }
}
