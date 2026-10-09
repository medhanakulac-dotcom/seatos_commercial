import { readFileSync } from 'node:fs';
import { Injectable, Logger } from '@nestjs/common';
import { CrmAccount, CrmHealth, CrmSnapshotMeta, SEGMENTS, Segment } from '../../domain/workspace/entities/workspace.entities';
import { CrmAccountSource, CrmNoteSync } from '../../domain/workspace/types/repositories/workspace.ports';
import * as fixture from './hubspot-deals.fixture.json';

/** Shape of a HubSpot "deals with health_status" export, as used by the commercial team's prototype. */
interface HubSpotDealExport {
  meta: { portal: string; pulledAt: string; source: string };
  accounts: {
    id: string;
    hsid: string;
    op: string;
    seg: string;
    hh: string;
    country: string | null;
    owner: string | null;
    amount: number | null;
    created: string;
    mod: string;
    note: string | null;
    deals: { id: string; pipe: string; stage: string; amount: number | null; health: string }[];
  }[];
}

const CRM_HEALTHS: readonly CrmHealth[] = ['Unhealthy', 'Watchlist', 'Healthy'];
const asHealth = (v: string): CrmHealth => (CRM_HEALTHS.includes(v as CrmHealth) ? (v as CrmHealth) : 'Unhealthy');
const asSegment = (v: string): Segment => (SEGMENTS.includes(v as Segment) ? (v as Segment) : 'Low');

export function mapHubSpotExport(data: HubSpotDealExport, portalId?: string): { meta: CrmSnapshotMeta; accounts: CrmAccount[] } {
  const dealUrl = (id: string) => (portalId ? `https://app.hubspot.com/contacts/${portalId}/record/0-3/${id}` : null);
  return {
    meta: { kind: 'mock', portal: data.meta.portal, pulledAt: data.meta.pulledAt, description: data.meta.source },
    accounts: data.accounts.map((a) => ({
      id: `D-${a.id}`,
      crmId: a.hsid,
      name: a.op,
      segment: asSegment(a.seg),
      crmHealth: asHealth(a.hh),
      country: a.country || null,
      owner: !a.owner || a.owner === 'Unassigned' ? null : a.owner,
      amount: a.amount,
      createdAt: a.created,
      modifiedAt: a.mod,
      lastNoteAt: a.note || null,
      deals: a.deals.map((d) => ({ id: d.id, pipeline: d.pipe, stage: d.stage, amount: d.amount, health: asHealth(d.health), url: dealUrl(d.id) })),
      // Synthetic recipient on the reserved .example domain: never deliverable.
      contacts: [{ id: `mock-${a.id}`, name: `${a.op} team`, email: `ops@${a.op.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.example` }],
    })),
  };
}

/**
 * Serves a HubSpot deal export from disk. Defaults to the bundled synthetic fixture;
 * `HUBSPOT_FIXTURE_PATH` points it at a local export (keep real exports out of git).
 */
@Injectable()
export class MockHubSpotAccountSource implements CrmAccountSource {
  private readonly logger = new Logger(MockHubSpotAccountSource.name);

  async snapshot() {
    const path = process.env.HUBSPOT_FIXTURE_PATH;
    const data: HubSpotDealExport = path ? JSON.parse(readFileSync(path, 'utf8')) : (fixture as unknown as HubSpotDealExport);
    if (path) this.logger.log(`Loaded HubSpot export from ${path} (${data.accounts.length} accounts)`);
    return mapHubSpotExport(data, process.env.HUBSPOT_PORTAL_ID);
  }
}

/** Records notes in memory instead of calling the HubSpot notes API. */
@Injectable()
export class MockHubSpotNoteSync implements CrmNoteSync {
  readonly connected = true;
  readonly pushed: { dealId: string; note: string; accountId: string; at: string }[] = [];

  async pushNote(input: { dealId: string; note: string; accountId: string; at: string }): Promise<void> {
    this.pushed.push(input);
  }
}
