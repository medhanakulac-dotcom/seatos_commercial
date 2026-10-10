import { Body, Controller, Headers, HttpCode, Post, ServiceUnavailableException, UnauthorizedException, UseFilters, UseGuards } from '@nestjs/common';
import { WeeklyDataService } from '../../domain/workspace/services/weekly-data.service';
import { agentAuthorized } from '../agent/mcp.controller';
import { WorkspaceErrorFilter } from '../workspace/controllers/workspace-error.filter';
import { JsonRequestGuard } from '../workspace/dto/requests/workspace.validation';

/** Who the sync is recorded as in the upload history. */
export const BIGQUERY_SYNC_ACTOR = 'bigquery-sync';

/**
 * The weekly BigQuery sync posts here (a Google Apps Script running the query as a team member, see
 * bigquery/weekly-sync.gs) with `Authorization: Bearer <WEEKLY_INGEST_TOKEN>`. On the site: `/api/ow/ingest/weekly-usage` and `/api/ow/ingest/weekly-tickets`.
 * Disabled (503) until the token is set; the token only allows this one write.
 */
@Controller('ingest')
@UseGuards(JsonRequestGuard)
@UseFilters(WorkspaceErrorFilter)
export class WeeklyIngestController {
  constructor(private readonly weekly: WeeklyDataService) {}

  /** `{ week: 'YYYY-MM-DD' (a Monday), rows: [{ operatorId, operatorName, categories: ['r', ...], features: { bf: { events, days } } }] }` */
  @Post('weekly-usage')
  @HttpCode(200)
  usage(@Headers('authorization') authorization: string | undefined, @Body() body: unknown) {
    authorize(authorization);
    return this.weekly.ingestUsage(body, BIGQUERY_SYNC_ACTOR);
  }

  /** `{ week: 'YYYY-MM-DD' (a Monday), rows: [{ operatorId, operatorName, tickets }] }` — tickets sold that week. */
  @Post('weekly-tickets')
  @HttpCode(200)
  tickets(@Headers('authorization') authorization: string | undefined, @Body() body: unknown) {
    authorize(authorization);
    return this.weekly.ingestTickets(body, BIGQUERY_SYNC_ACTOR);
  }

  /** `{ windowDays, rows: [{ operatorId, operatorName, currency, ticketsCompared, segments, pricePct, detail: [...] }] }` — replaces the price comparison. */
  @Post('pricing')
  @HttpCode(200)
  pricing(@Headers('authorization') authorization: string | undefined, @Body() body: unknown) {
    authorize(authorization);
    return this.weekly.ingestPricing(body, BIGQUERY_SYNC_ACTOR);
  }
}

function authorize(authorization: string | undefined): void {
  const token = process.env.WEEKLY_INGEST_TOKEN;
  if (!token) throw new ServiceUnavailableException('WEEKLY_INGEST_TOKEN is not set');
  if (!agentAuthorized(authorization, token)) throw new UnauthorizedException();
}
