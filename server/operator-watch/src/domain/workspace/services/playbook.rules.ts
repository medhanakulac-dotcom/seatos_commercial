import {
  ActiveSegment,
  CrmAccount,
  CrmHealth,
  Health,
  Language,
  PlayType,
  Segment,
  Signal,
} from '../entities/workspace.entities';

export interface Playbook {
  readonly name: string;
  readonly description: string;
}

/** Segment × product health → playbook. Segment sets the ambition; health sets the gap. */
export const PLAYBOOK_MATRIX: Readonly<Record<ActiveSegment, Readonly<Record<Health, Playbook>>>> = {
  High: {
    Unhealthy: { name: 'Rescue', description: 'Move Unhealthy → Adopted → Healthy. Always asks for a call.' },
    Adopted: { name: 'Push to Healthy', description: 'Move Adopted → Healthy.' },
    Healthy: { name: 'Grow', description: 'Expand value and partnership.' },
  },
  Mid: {
    Unhealthy: { name: 'Adoption Push', description: 'Improve adoption.' },
    Adopted: { name: 'Maintain / Light Push', description: 'Acceptable baseline — light push on remaining features.' },
    Healthy: { name: 'Maintain', description: 'Maintain engagement.' },
  },
  Low: {
    Unhealthy: { name: 'Automated Activation', description: 'Automated activation sequence.' },
    Adopted: { name: 'Self-Service / Nudge', description: 'Self-serve, with the occasional automated nudge.' },
    Healthy: { name: 'Self-Service', description: 'Self-service engagement.' },
  },
};

export const DORMANT_PLAYBOOK: Playbook = {
  name: 'Reactive Only',
  description: 'No proactive touchpoints — respond to inbound requests only.',
};

/** Description for a playbook name chosen by the agent (empty when it is not one of the team's playbooks). */
export function describePlaybook(name: string): string {
  if (name === DORMANT_PLAYBOOK.name) return DORMANT_PLAYBOOK.description;
  for (const row of Object.values(PLAYBOOK_MATRIX)) for (const p of Object.values(row)) if (p.name === name) return p.description;
  return '';
}

/** Drafts are only written when Generate is clicked, except for these playbooks. */
export const AUTO_DRAFT_PLAYBOOKS: readonly string[] = ['Automated Activation', 'Reactive Only'];

export const PLAY_OUTBOX: Readonly<Record<PlayType, string>> = { Retention: 'OUT-1', Adoption: 'OUT-2', Commercial: 'OUT-3' };

export const DETECTORS: Readonly<Record<string, string>> = {
  'HubSpot health': 'CRM-1',
  'HubSpot activity': 'CRM-2',
  Volume: 'ANL-1',
  'Route peer': 'ANL-2',
  'Fare index': 'ANL-3',
  Adoption: 'ANL-4',
};

/** Feature recommendations. Names are illustrative: replace with the real seatOS catalogue. */
export const FEATURE_NAMES = {
  RouteAlerts: 'Route Alerts',
  RoutePeer: 'Route Peer Benchmark',
  AgentActivity: 'Agent Activity Report',
  FareIndex: 'Fare Index Benchmark',
  FarePricingTest: 'Fare Class Pricing Test',
  FareAlerts: 'Fare Alerts',
  Bundling: 'Ancillary Bundling',
  Invitations: 'Agent Invitations',
  WeeklyReport: 'Weekly Activity Report',
  VolumeTrend: 'Volume Trend Alerts',
  ScheduledReports: 'Scheduled Reports',
} as const;
export type FeatureKey = keyof typeof FEATURE_NAMES;

export const RECOMMENDED_FEATURES: Readonly<Record<Health, readonly FeatureKey[]>> = {
  Unhealthy: ['Invitations', 'WeeklyReport', 'VolumeTrend'],
  Adopted: ['Bundling', 'ScheduledReports'],
  Healthy: ['ScheduledReports'],
};

const CRM_HEALTH: Readonly<Record<CrmHealth, Health>> = { Unhealthy: 'Unhealthy', Watchlist: 'Adopted', Healthy: 'Healthy' };
const COUNTRY_LANGUAGE: Readonly<Record<string, Language>> = { Thailand: 'th', Vietnam: 'vi', Indonesia: 'id' };
const SEGMENT_RANK: Readonly<Record<Segment, number>> = { High: 0, Mid: 1, Low: 2, Dormant: 3 };
const HEALTH_RANK: Readonly<Record<Health, number>> = { Unhealthy: 0, Adopted: 1, Healthy: 2 };

export const healthFromCrm = (value: CrmHealth): Health => CRM_HEALTH[value] ?? 'Unhealthy';
export const languageForCountry = (country: string | null): Language => (country && COUNTRY_LANGUAGE[country]) || 'en';

export function playbookFor(segment: Segment, health: Health): Playbook {
  return segment === 'Dormant' ? DORMANT_PLAYBOOK : PLAYBOOK_MATRIX[segment][health];
}


export function playTypeFor(health: Health): PlayType {
  return health === 'Unhealthy' ? 'Retention' : health === 'Adopted' ? 'Adoption' : 'Commercial';
}

/** Lower is more urgent: segment first, then product health. */
export const priorityOf = (segment: Segment, health: Health): number => SEGMENT_RANK[segment] * 10 + HEALTH_RANK[health];


export function daysBetween(from: string | null, reference: string): number | null {
  if (!from) return null;
  return Math.max(0, Math.round((Date.parse(reference) - Date.parse(from)) / 864e5));
}

function signal(detector: string, text: string): Signal {
  return { detector, code: DETECTORS[detector], text };
}

export interface CaseInsight {
  readonly health: Health;
  readonly dormant: boolean;
  readonly play: PlayType;
  readonly signals: readonly Signal[];
  readonly why: string;
  readonly next: string;
}

/** Rule-based reading of the CRM fields (segment, health status, stage, last note). No LLM involved. */
export function analyseAccount(account: CrmAccount, referenceDate: string): CaseInsight {
  const health = healthFromCrm(account.crmHealth);
  const dormant = account.segment === 'Dormant';
  const mainDeal = account.deals[0];
  const idleDays = daysBetween(account.lastNoteAt ?? account.modifiedAt, referenceDate);
  const signals: Signal[] = [signal('HubSpot health', `Health status: ${account.crmHealth}`)];
  if (idleDays !== null && idleDays > 14) signals.push(signal('HubSpot activity', `No note logged in ${idleDays} days`));
  if (mainDeal?.pipeline === 'Customer Adoption Pipeline') signals.push(signal('HubSpot health', `Adoption project · ${mainDeal.stage}`));

  const playbook = playbookFor(account.segment, health).name;
  const features = RECOMMENDED_FEATURES[health].map((k) => FEATURE_NAMES[k]).join(', ');
  const where = mainDeal ? `, currently at “${mainDeal.stage}” in ${mainDeal.pipeline}` : '';
  const lastNote = idleDays !== null ? ` The last note was logged ${idleDays} day${idleDays === 1 ? '' : 's'} ago.` : '';
  const why =
    `${account.name}${account.country ? ` (${account.country})` : ''} is a ${account.segment} account with health status ` +
    `“${account.crmHealth}” in HubSpot${where}.${lastNote} Playbook: ${playbook}.`;
  const next = dormant
    ? 'Do not reach out; respond only if they contact us.'
    : health === 'Healthy'
      ? 'Healthy — nothing to send. Keep monitoring.'
      : playbook === 'Rescue'
        ? `Rescue play: book a 20-minute call this week and recommend ${features}.`
        : `Recommend ${features}.`;

  return { health, dormant, play: playTypeFor(health), signals, why, next };
}
