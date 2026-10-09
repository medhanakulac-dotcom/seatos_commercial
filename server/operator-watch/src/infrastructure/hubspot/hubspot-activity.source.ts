import { Logger } from '@nestjs/common';
import { CrmAccount, CrmActivity, CrmActivityType } from '../../domain/workspace/entities/workspace.entities';
import { CrmActivitySource } from '../../domain/workspace/types/repositories/workspace.ports';
import { HubSpotApiError, HubSpotClient } from './hubspot.client';

type Props = Record<string, string | null | undefined>;
interface HsObject { id: string; properties: Props }
interface HsAssociationRow { from: { id: string }; to: { toObjectId: number | string }[] }
interface HsOwner { id: string; firstName?: string | null; lastName?: string | null; email?: string | null }
interface HsAccountInfo { portalId: number; uiDomain?: string }

/** How each HubSpot engagement object maps onto an activity. */
const OBJECTS: readonly {
  object: string;
  type: CrmActivityType;
  props: string[];
  at: string[];
  title: (p: Props) => string | null;
  body: (p: Props) => string | null;
  detail: (p: Props) => string | null;
}[] = [
  { object: 'notes', type: 'note', props: ['hs_note_body', 'hs_timestamp'], at: ['hs_timestamp'], title: () => null, body: (p) => p.hs_note_body ?? null, detail: () => null },
  {
    object: 'meetings',
    type: 'meeting',
    props: ['hs_meeting_title', 'hs_meeting_body', 'hs_internal_meeting_notes', 'hs_meeting_start_time', 'hs_meeting_outcome', 'hs_timestamp'],
    at: ['hs_meeting_start_time', 'hs_timestamp'],
    title: (p) => p.hs_meeting_title ?? null,
    body: (p) => [p.hs_meeting_body, p.hs_internal_meeting_notes].filter(Boolean).join('\n\n') || null,
    detail: (p) => p.hs_meeting_outcome ?? null,
  },
  {
    object: 'calls',
    type: 'call',
    props: ['hs_call_title', 'hs_call_body', 'hs_call_direction', 'hs_call_status', 'hs_timestamp'],
    at: ['hs_timestamp'],
    title: (p) => p.hs_call_title ?? null,
    body: (p) => p.hs_call_body ?? null,
    detail: (p) => [p.hs_call_direction, p.hs_call_status].filter(Boolean).join(' · ') || null,
  },
  {
    object: 'emails',
    type: 'email',
    props: ['hs_email_subject', 'hs_email_text', 'hs_email_html', 'hs_email_direction', 'hs_timestamp'],
    at: ['hs_timestamp'],
    title: (p) => p.hs_email_subject ?? null,
    body: (p) => p.hs_email_text || p.hs_email_html || null,
    detail: (p) => p.hs_email_direction ?? null,
  },
  {
    object: 'tasks',
    type: 'task',
    props: ['hs_task_subject', 'hs_task_body', 'hs_task_status', 'hs_timestamp'],
    at: ['hs_timestamp'],
    title: (p) => p.hs_task_subject ?? null,
    body: (p) => p.hs_task_body ?? null,
    detail: (p) => p.hs_task_status ?? null,
  },
  {
    object: 'communications',
    type: 'message',
    props: ['hs_communication_body', 'hs_communication_channel_type', 'hs_timestamp'],
    at: ['hs_timestamp'],
    title: () => null,
    body: (p) => p.hs_communication_body ?? null,
    detail: (p) => p.hs_communication_channel_type ?? null,
  },
];

const MAX_BODY = 3000;
const PER_TYPE = 50;
const CACHE_MS = 10 * 60_000;

/** HubSpot rich text → plain text: line breaks kept, tags dropped, common entities decoded. */
export function plainText(html: string | null | undefined, max = MAX_BODY): string | null {
  if (!html) return null;
  const text = html
    .replace(/<(br|\/p|\/div|\/li|\/h\d|\/tr)\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/**
 * Everything logged against an operator in HubSpot — notes, meetings, calls, emails, tasks and logged messages
 * (LINE/WhatsApp/SMS) — on its deals and its company, read live (not part of the run snapshot).
 * Needs the matching read scopes; a type the token cannot read is skipped.
 */
export class HubSpotActivitySource implements CrmActivitySource {
  readonly connected = true;
  private readonly logger = new Logger(HubSpotActivitySource.name);
  private lookups?: { at: number; owners: Map<string, string>; recordUrl: (dealId: string) => string };

  constructor(private readonly hubspot: HubSpotClient) {}

  async activity(account: CrmAccount, limit: number): Promise<CrmActivity[]> {
    const { owners, recordUrl } = await this.lookupTables();
    const url = recordUrl(account.crmId);
    const dealIds = account.deals.map((d) => d.id);
    const all: CrmActivity[] = [];
    for (const kind of OBJECTS) {
      try {
        const ids = new Set<string>();
        for (const id of await this.associated('deals', dealIds, kind.object)) ids.add(id);
        if (account.companyId) for (const id of await this.associated('companies', [account.companyId], kind.object)) ids.add(id);
        if (!ids.size) continue;
        const res = await this.hubspot.post<{ results: HsObject[] }>(`/crm/v3/objects/${kind.object}/batch/read`, {
          // Ids grow over time, so the highest are the most recent; one batch read takes up to 100.
          inputs: [...ids].sort((x, y) => Number(y) - Number(x)).slice(0, PER_TYPE).map((id) => ({ id })),
          properties: [...kind.props, 'hubspot_owner_id', 'hs_createdate'],
        });
        for (const o of res.results) {
          const p = o.properties;
          const at = kind.at.map((k) => p[k]).find(Boolean) ?? p.hs_createdate ?? null;
          if (!at) continue;
          all.push({
            id: `${kind.type}-${o.id}`,
            type: kind.type,
            at: new Date(Number.isNaN(Number(at)) ? at : Number(at)).toISOString(),
            title: plainText(kind.title(p), 300),
            body: plainText(kind.body(p)),
            detail: kind.detail(p),
            owner: p.hubspot_owner_id ? (owners.get(p.hubspot_owner_id) ?? null) : null,
            url,
          });
        }
      } catch (error) {
        if (error instanceof HubSpotApiError && (error.status === 403 || error.status === 401)) {
          this.logger.warn(`HubSpot ${kind.object} not readable with this token; skipped`);
          continue;
        }
        throw error;
      }
    }
    return all.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
  }

  private async associated(from: 'deals' | 'companies', ids: string[], to: string): Promise<string[]> {
    if (!ids.length) return [];
    const res = await this.hubspot.post<{ results: HsAssociationRow[] }>(`/crm/v4/associations/${from}/${to}/batch/read`, { inputs: ids.map((id) => ({ id })) });
    return res.results.flatMap((r) => r.to.map((t) => String(t.toObjectId)));
  }

  /** Owner names and the record link format, refreshed every 10 minutes. */
  private async lookupTables() {
    if (this.lookups && Date.now() - this.lookups.at < CACHE_MS) return this.lookups;
    const [owners, info] = await Promise.all([
      this.hubspot.listAll<HsOwner>('/crm/v3/owners', { archived: 'false' }),
      this.hubspot.get<HsAccountInfo>('/account-info/v3/details'),
    ]);
    const uiDomain = info.uiDomain ?? 'app.hubspot.com';
    this.lookups = {
      at: Date.now(),
      owners: new Map(owners.map((o) => [o.id, [o.firstName, o.lastName].filter(Boolean).join(' ') || o.email || `Owner ${o.id}`])),
      recordUrl: (dealId: string) => `https://${uiDomain}/contacts/${info.portalId}/record/0-3/${dealId}`,
    };
    return this.lookups;
  }
}

/** No CRM connected (mock data): no activity. */
export class NoCrmActivity implements CrmActivitySource {
  readonly connected = false;
  async activity(): Promise<CrmActivity[]> {
    return [];
  }
}
