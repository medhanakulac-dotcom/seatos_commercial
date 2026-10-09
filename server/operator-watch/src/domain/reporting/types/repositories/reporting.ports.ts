export type Scalar = string | number | boolean | null;
export interface CrmAccount { readonly operatorId: string; readonly name: string; readonly segment: 'high' | 'mid' | 'low' | 'dormant'; readonly health: 'healthy' | 'adopted' | 'unhealthy' | 'watchlist'; }
export interface UsageEvent { readonly operatorId: string; readonly eventName: string; readonly occurredAt: string; readonly utm?: Readonly<Record<string, string>>; readonly properties: Readonly<Record<string, Scalar>>; }
export interface TmsUsageSummary { readonly operatorId: string; readonly periodStart: string; readonly periodEnd: string; readonly bookings: number; readonly completedTrips: number; readonly passengers: number; }
export interface HubSpotPort { listAccounts(operatorId: string): Promise<readonly CrmAccount[]>; }
export interface AnalyticsPort { usageByOperator(operatorId: string, start: string, end: string): Promise<readonly UsageEvent[]>; }
export interface TmsPort { usageSummary(operatorId: string, start: string, end: string): Promise<TmsUsageSummary>; }
export const HUBSPOT_PORT = Symbol('HUBSPOT_PORT');
export const ANALYTICS_PORT = Symbol('ANALYTICS_PORT');
export const TMS_PORT = Symbol('TMS_PORT');
