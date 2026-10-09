import { Inject, Injectable, Logger } from '@nestjs/common';
import { CrmAccount, CrmContact, CrmDeal, CrmHealth, CrmSnapshotMeta, Segment } from '../../domain/workspace/entities/workspace.entities';
import { CrmAccountSource } from '../../domain/workspace/types/repositories/workspace.ports';
import { HubSpotApiError, HubSpotClient } from './hubspot.client';
import { HUBSPOT_CONFIG, HubSpotConfig } from './hubspot.config';

type Props = Record<string, string | null | undefined>;
export interface HsObject { id: string; properties: Props }
interface HsPipeline { id: string; label: string; stages: { id: string; label: string }[] }
interface HsOwner { id: string; firstName?: string | null; lastName?: string | null; email?: string | null }
interface HsAssociationRow { from: { id: string }; to: { toObjectId: number | string }[] }
interface HsAccountInfo { portalId: number; uiDomain?: string; timeZone?: string }

const BATCH = 100;
const chunk = <T>(items: T[], size: number): T[][] => Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, i * size + size));
const day = (iso: string | null | undefined): string | null => (iso ? iso.slice(0, 10) : null);
const latest = (...dates: (string | null | undefined)[]): string | null => dates.filter((d): d is string => !!d).sort().at(-1) ?? null;
const num = (v: string | null | undefined): number | null => (v == null || v === '' || Number.isNaN(Number(v)) ? null : Number(v));

const SEGMENTS: Record<string, Segment> = { high: 'High', mid: 'Mid', medium: 'Mid', low: 'Low', dormant: 'Dormant' };
const HEALTHS: Record<string, CrmHealth> = { unhealthy: 'Unhealthy', watchlist: 'Watchlist', 'watch list': 'Watchlist', healthy: 'Healthy' };

/**
 * Case-insensitive match on the option value, e.g. "high", "High", "HIGH". `extra` (from HUBSPOT_SEGMENT_MAP)
 * maps portal-specific values such as "Medium High" onto a workspace segment.
 */
export const normaliseSegment = (v: string | null | undefined, extra: Readonly<Record<string, string>> = {}): Segment | null => {
  if (!v) return null;
  const key = v.trim().toLowerCase();
  return SEGMENTS[extra[key] ?? key] ?? null;
};
export const normaliseHealth = (v: string | null | undefined): CrmHealth | null => (v ? (HEALTHS[v.trim().toLowerCase().replace(/_/g, ' ')] ?? null) : null);

/**
 * Live CRM source. Reads deals that carry the health property; each deal in the primary pipeline is one
 * account (an operator) and other deals such as adoption projects are attached to it (see `groupDeals`).
 * Companies only supply a fallback country and note activity. Read-only — needs deals, companies and
 * owners read scopes.
 */
@Injectable()
export class HubSpotAccountSource implements CrmAccountSource {
  private readonly logger = new Logger(HubSpotAccountSource.name);

  constructor(
    private readonly hubspot: HubSpotClient,
    @Inject(HUBSPOT_CONFIG) private readonly config: HubSpotConfig,
  ) {}

  async snapshot(): Promise<{ meta: CrmSnapshotMeta; accounts: CrmAccount[] }> {
    const c = this.config;
    const [info, pipelines, owners] = await Promise.all([
      this.hubspot.get<HsAccountInfo>('/account-info/v3/details'),
      this.hubspot.get<{ results: HsPipeline[] }>('/crm/v3/pipelines/deals').then((r) => r.results),
      this.hubspot.listAll<HsOwner>('/crm/v3/owners', { archived: 'false' }),
    ]);

    const dealProps = ['dealname', 'amount', 'pipeline', 'dealstage', 'createdate', 'closedate', 'hs_lastmodifieddate', 'notes_last_updated', 'hubspot_owner_id', c.healthProperty];
    if (c.segmentObject === 'deal') dealProps.push(c.segmentProperty);
    dealProps.push(c.countryProperty);
    const deals = await this.hubspot.searchAll<HsObject>('/crm/v3/objects/deals/search', {
      filterGroups: [{ filters: [{ propertyName: c.healthProperty, operator: 'HAS_PROPERTY' }] }],
      properties: [...new Set(dealProps)],
      sorts: [{ propertyName: 'createdate', direction: 'ASCENDING' }],
    });

    const dealCompany = await this.companiesOf(deals.map((d) => d.id));
    const companyIds = [...new Set(dealCompany.values())];
    const companyProps = ['name', 'notes_last_updated', c.companyCountryProperty, ...(c.segmentObject === 'company' ? [c.segmentProperty] : [])];
    const companies = new Map<string, Props>();
    for (const ids of chunk(companyIds, BATCH)) {
      const res = await this.hubspot.post<{ results: HsObject[] }>('/crm/v3/objects/companies/batch/read', { inputs: ids.map((id) => ({ id })), properties: companyProps });
      for (const co of res.results) companies.set(co.id, co.properties);
    }

    const contacts = await this.contactsOf(deals.filter((d) => pipelines.some((p) => p.id === d.properties.pipeline && p.label === c.primaryPipeline)).map((d) => d.id));

    const pipelineLabel = new Map(pipelines.map((p) => [p.id, p.label]));
    const stageLabel = new Map(pipelines.flatMap((p) => p.stages.map((s) => [s.id, s.label] as const)));
    const ownerName = new Map(owners.map((o) => [o.id, [o.firstName, o.lastName].filter(Boolean).join(' ') || o.email || `Owner ${o.id}`]));
    const uiDomain = info.uiDomain || 'app.hubspot.com';
    const dealUrl = (id: string) => `https://${uiDomain}/contacts/${info.portalId}/record/0-3/${id}`;

    const isPrimary = (d: HsObject) => pipelineLabel.get(d.properties.pipeline ?? '') === c.primaryPipeline;
    const groups = groupDeals(deals.filter(isPrimary), deals.filter((d) => !isPrimary(d)), dealCompany);

    const skipped = { health: new Map<string, number>(), segment: new Map<string, number>() };
    const tally = (m: Map<string, number>, v: string | null | undefined) => m.set(v || '(empty)', (m.get(v || '(empty)') ?? 0) + 1);
    const accounts: CrmAccount[] = [];
    for (const group of groups) {
      const [primary] = group;
      const companyId = dealCompany.get(primary.id);
      const company = companyId ? companies.get(companyId) : undefined;
      const health = normaliseHealth(primary.properties[c.healthProperty]);
      if (!health) {
        tally(skipped.health, primary.properties[c.healthProperty]);
        continue;
      }
      const segmentValue = c.segmentObject === 'company' ? company?.[c.segmentProperty] : primary.properties[c.segmentProperty];
      let segment = normaliseSegment(segmentValue, c.segmentMap);
      if (!segment) {
        // Unknown segment → no proactive outreach until it is mapped or set in HubSpot.
        tally(skipped.segment, segmentValue);
        segment = 'Dormant';
      }
      const toDeal = (d: HsObject): CrmDeal => ({
        id: d.id,
        pipeline: pipelineLabel.get(d.properties.pipeline ?? '') ?? d.properties.pipeline ?? '—',
        stage: stageLabel.get(d.properties.dealstage ?? '') ?? d.properties.dealstage ?? '—',
        amount: num(d.properties.amount),
        health: normaliseHealth(d.properties[c.healthProperty]) ?? 'Unhealthy',
        url: dealUrl(d.id),
        closeDate: day(d.properties.closedate),
      });
      const ownerId = primary.properties.hubspot_owner_id;
      accounts.push({
        id: `D-${primary.id}`,
        crmId: primary.id,
        // The deal name is the operator; one HubSpot company can hold many operators.
        name: primary.properties.dealname?.trim() || company?.name?.trim() || `Deal ${primary.id}`,
        segment,
        crmHealth: health,
        country: primary.properties[c.countryProperty] || company?.[c.companyCountryProperty] || null,
        owner: ownerId ? (ownerName.get(ownerId) ?? `Owner ${ownerId}`) : null,
        amount: num(primary.properties.amount),
        createdAt: day(primary.properties.createdate) ?? '1970-01-01',
        modifiedAt: day(latest(...group.map((d) => d.properties.hs_lastmodifieddate))) ?? day(primary.properties.createdate) ?? '1970-01-01',
        lastNoteAt: day(latest(company?.notes_last_updated, ...group.map((d) => d.properties.notes_last_updated))),
        closeDate: day(primary.properties.closedate),
        deals: group.map(toDeal),
        contacts: contacts.get(primary.id) ?? [],
      });
    }

    const describe = (m: Map<string, number>) => [...m].map(([v, n]) => `"${v}" ×${n}`).join(', ');
    if (skipped.health.size) this.logger.warn(`Skipped accounts with unrecognised ${c.healthProperty} on the main deal: ${describe(skipped.health)}`);
    if (skipped.segment.size)
      this.logger.warn(`Treated as Dormant (no outreach) — unrecognised ${c.segmentObject}.${c.segmentProperty}: ${describe(skipped.segment)}. Map them with HUBSPOT_SEGMENT_MAP.`);
    this.logger.log(`HubSpot snapshot: ${deals.length} deals → ${accounts.length} accounts`);

    return {
      meta: { kind: 'hubspot', portal: c.portalName, pulledAt: bangkokDate(new Date()), description: `HubSpot deals with ${c.healthProperty}` },
      accounts,
    };
  }

  /**
   * Deal id → associated contacts with an email (the email recipients). Needs crm.objects.contacts.read;
   * without it the snapshot still loads and recipients are entered at approval.
   */
  private async contactsOf(dealIds: string[]): Promise<Map<string, CrmContact[]>> {
    const byDeal = new Map<string, string[]>();
    const result = new Map<string, CrmContact[]>();
    try {
      for (const ids of chunk(dealIds, BATCH)) {
        const res = await this.hubspot.post<{ results: HsAssociationRow[] }>('/crm/v4/associations/deals/contacts/batch/read', { inputs: ids.map((id) => ({ id })) });
        for (const row of res.results) byDeal.set(String(row.from.id), row.to.map((t) => String(t.toObjectId)));
      }
      const people = new Map<string, CrmContact>();
      for (const ids of chunk([...new Set([...byDeal.values()].flat())], BATCH)) {
        const res = await this.hubspot.post<{ results: HsObject[] }>('/crm/v3/objects/contacts/batch/read', { inputs: ids.map((id) => ({ id })), properties: ['email', 'firstname', 'lastname'] });
        for (const p of res.results) {
          const email = p.properties.email?.trim();
          if (email) people.set(p.id, { id: p.id, email, name: [p.properties.firstname, p.properties.lastname].filter(Boolean).join(' ').trim() || email });
        }
      }
      for (const [dealId, ids] of byDeal) result.set(dealId, ids.map((id) => people.get(id)).filter((p): p is CrmContact => !!p));
    } catch (error) {
      if (error instanceof HubSpotApiError && error.status === 403) this.logger.warn('Contacts not loaded: the HubSpot token lacks crm.objects.contacts.read (recipients will be entered at approval)');
      else throw error;
    }
    return result;
  }

  /** Deal id → first associated company id. */
  private async companiesOf(dealIds: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    for (const ids of chunk(dealIds, BATCH)) {
      const res = await this.hubspot.post<{ results: HsAssociationRow[] }>('/crm/v4/associations/deals/companies/batch/read', { inputs: ids.map((id) => ({ id })) });
      for (const row of res.results) if (row.to[0]) map.set(String(row.from.id), String(row.to[0].toObjectId));
    }
    return map;
  }
}

const nameKey = (s: string | null | undefined) => (s ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/**
 * One account per main-pipeline deal (an operator). Every other deal — e.g. an adoption project — is
 * attached to a main deal of the same company when that company has exactly one, otherwise to the only
 * main deal whose name it contains (or is contained in). Anything still unmatched stands alone.
 * Returns groups with the main deal first.
 */
export function groupDeals(primaries: HsObject[], others: HsObject[], dealCompany: ReadonlyMap<string, string>): HsObject[][] {
  const groups = new Map<string, HsObject[]>(primaries.map((d) => [d.id, [d]]));
  const standalone: HsObject[][] = [];
  for (const d of others) {
    const company = dealCompany.get(d.id);
    const sameCompany = company ? primaries.filter((p) => dealCompany.get(p.id) === company) : [];
    let target = sameCompany.length === 1 ? sameCompany[0] : undefined;
    if (!target) {
      const name = nameKey(d.properties.dealname);
      const candidates = (sameCompany.length ? sameCompany : primaries).filter((p) => {
        const pn = nameKey(p.properties.dealname);
        return pn.length > 2 && name.length > 2 && (name.includes(pn) || pn.includes(name));
      });
      target = candidates.length === 1 ? candidates[0] : undefined;
    }
    if (target) groups.get(target.id)!.push(d);
    else standalone.push([d]);
  }
  return [...groups.values(), ...standalone];
}

const bangkokDate =(d: Date): string => new Date(d.getTime() + 7 * 36e5).toISOString().slice(0, 10);
