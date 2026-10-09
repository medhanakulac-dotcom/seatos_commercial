export type CrmSourceMode = 'mock' | 'hubspot';

export interface HubSpotConfig {
  /** Private-app access token (`pat-…`). Server-side only; never logged or returned. */
  readonly accessToken: string;
  readonly baseUrl: string;
  readonly portalName: string;
  /** Deal property holding the customer-health value (Unhealthy / Watchlist / Healthy). */
  readonly healthProperty: string;
  /** Property holding the commercial segment (High / Mid / Low / Dormant) and the object it lives on. */
  readonly segmentProperty: string;
  readonly segmentObject: 'deal' | 'company';
  /** Extra raw-value → segment mappings, e.g. `Medium High=High;At Risk=Dormant`. */
  readonly segmentMap: Readonly<Record<string, string>>;
  /** Deal country property (preferred: a curated dropdown), then the company's free-text country. */
  readonly countryProperty: string;
  readonly companyCountryProperty: string;
  /** Pipeline label whose deal is the account's main deal (others are e.g. adoption projects). */
  readonly primaryPipeline: string;
  /** Opt-in: write notes logged in the workspace back to HubSpot. Off by default. */
  readonly notesEnabled: boolean;
  readonly timeoutMs: number;
}

export const HUBSPOT_CONFIG = Symbol('HUBSPOT_CONFIG');

export function crmSourceMode(env: NodeJS.ProcessEnv = process.env): CrmSourceMode {
  const mode = (env.CRM_SOURCE ?? 'mock').trim().toLowerCase();
  if (mode !== 'mock' && mode !== 'hubspot') throw new Error('CRM_SOURCE must be "mock" or "hubspot"');
  return mode;
}

export function loadHubSpotConfig(env: NodeJS.ProcessEnv = process.env): HubSpotConfig {
  const accessToken = env.HUBSPOT_ACCESS_TOKEN?.trim() ?? '';
  if (!accessToken) throw new Error('HUBSPOT_ACCESS_TOKEN is required when CRM_SOURCE=hubspot');
  const segmentObject = (env.HUBSPOT_SEGMENT_OBJECT ?? 'deal').trim().toLowerCase();
  if (segmentObject !== 'deal' && segmentObject !== 'company') throw new Error('HUBSPOT_SEGMENT_OBJECT must be "deal" or "company"');
  const timeoutMs = Number(env.HUBSPOT_TIMEOUT_MS ?? 15000);
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) throw new Error('HUBSPOT_TIMEOUT_MS must be a positive integer');
  return {
    accessToken,
    baseUrl: (env.HUBSPOT_BASE_URL ?? 'https://api.hubapi.com').replace(/\/+$/, ''),
    portalName: env.HUBSPOT_PORTAL_NAME?.trim() || 'SeatOS',
    healthProperty: env.HUBSPOT_HEALTH_PROPERTY?.trim() || 'health_status',
    segmentProperty: env.HUBSPOT_SEGMENT_PROPERTY?.trim() || 'client_segment',
    segmentObject,
    segmentMap: parseSegmentMap(env.HUBSPOT_SEGMENT_MAP),
    countryProperty: env.HUBSPOT_COUNTRY_PROPERTY?.trim() || 'country',
    companyCountryProperty: env.HUBSPOT_COMPANY_COUNTRY_PROPERTY?.trim() || 'country',
    primaryPipeline: env.HUBSPOT_PRIMARY_PIPELINE?.trim() || 'Client Pipeline',
    notesEnabled: env.HUBSPOT_NOTES_ENABLED === 'true',
    timeoutMs,
  };
}

const WORKSPACE_SEGMENTS = ['high', 'mid', 'low', 'dormant'];

/** `Medium High=High; At Risk=Dormant` → { 'medium high': 'high', 'at risk': 'dormant' } */
export function parseSegmentMap(raw: string | undefined): Record<string, string> {
  const map: Record<string, string> = {};
  for (const pair of (raw ?? '').split(';').map((p) => p.trim()).filter(Boolean)) {
    const [from, to] = pair.split('=').map((p) => p?.trim().toLowerCase());
    if (!from || !to || !WORKSPACE_SEGMENTS.includes(to)) throw new Error(`HUBSPOT_SEGMENT_MAP entry "${pair}" must look like "<HubSpot value>=High|Mid|Low|Dormant"`);
    map[from] = to;
  }
  return map;
}
