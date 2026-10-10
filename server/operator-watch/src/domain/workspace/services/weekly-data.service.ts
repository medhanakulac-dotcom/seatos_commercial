import { Inject, Injectable } from '@nestjs/common';
import { CrmAccount } from '../entities/workspace.entities';
import { Clock, PricingRecord, PricingSegment, WEEKLY_DATA_STORE, WeeklyDataStore, WeeklyTicketRecord, WeeklyUsageRecord, WORKSPACE_CLOCK } from '../types/repositories/workspace.ports';
import { RunService } from './run.service';
import { CATEGORY_CODES, featureByCode, SEATOS_FEATURES } from './seatos-features';
import { cleanName, FEATURES, FeatureActivity, Feature, mondayOf, nameKey, parseTicketsCsv, parseUsageCsv, parseWeek, WeeklyDataError, WeeklyKind } from './weekly-data';

export interface UploadResult {
  readonly kind: WeeklyKind;
  readonly weeks: string[];
  readonly rows: number;
  readonly matched: number;
  /** Names that matched no account (and were not marked "ignore"): match them by hand once. */
  readonly unmatched: { name: string; key: string }[];
}

/** One operator's week as the BigQuery sync sends it. */
export interface UsageIngestRow {
  readonly operatorId: number;
  readonly operatorName: string;
  /** WAO categories with a counted event: i d r t f a c (CATEGORY_CODES). */
  readonly categories: readonly string[];
  /** Feature code → activity (Feature Event Map codes). */
  readonly features: Readonly<Record<string, FeatureActivity>>;
}

export interface IngestResult extends UploadResult {
  /** Feature codes in the payload that this site does not know (dropped). */
  readonly unknownFeatures: string[];
}

/** A stored usage row with the readable feature list the UI, Claude and MCP tools use. */
export interface UsageWithFeatures extends Omit<WeeklyUsageRecord, 'featureUsage'> {
  readonly featureUsage: { code: string; name: string; module: string; events: number; days: number }[];
}

/** A weekly tickets row as people and agents see it (GMV is stored for old uploads but no longer reported). */
export type TicketsView = Omit<WeeklyTicketRecord, 'gmvUsd'>;

export const MAX_INGEST_ROWS = 3000;
/** WAO: an operator is weekly active when it used at least this many of the 7 categories in a week. */
export const WAO_MIN_CATEGORIES = 3;
/** A feature counts as used in a week (the operator is active on it) from this many events. */
export const ACTIVE_FEATURE_EVENTS = 3;
/** The feature picker looks back this many weeks. */
const FEATURE_WEEKS = 4;

export interface FeatureUsageView {
  /** Weeks with usage data, newest first (at most four). */
  readonly weeks: string[];
  readonly features: { code: string; name: string; module: string }[];
  readonly feature: string | null;
  readonly operators: { operatorName: string; accountId: string | null; byWeek: Record<string, { events: number; days: number }>; events: number; activeWeeks: number }[];
}

/**
 * The weekly numbers the team uploads every Sunday night: Looker's feature usage table (WAO) and tickets.
 * Each operator name is matched to a workspace account (its HubSpot main deal) by normalised name, or by a match a
 * person made once; the match is stored with the row so agents and people can read numbers per account.
 */
@Injectable()
export class WeeklyDataService {
  constructor(
    @Inject(WEEKLY_DATA_STORE) private readonly store: WeeklyDataStore,
    private readonly runs: RunService,
    @Inject(WORKSPACE_CLOCK) private readonly clock: Clock,
  ) {}

  async upload(kind: WeeklyKind, csv: string, week: string | undefined, by: string): Promise<UploadResult> {
    const match = await this.matcher();
    if (kind === 'usage') {
      const parsed = parseUsageCsv(csv);
      const byWeek = new Map<string, WeeklyUsageRecord[]>();
      for (const r of parsed.rows) {
        const m = match(r.operatorName);
        byWeek.set(r.week, [...(byWeek.get(r.week) ?? []), { ...r, nameKey: m.key, accountId: m.accountId }]);
      }
      for (const [w, rows] of byWeek) await this.store.replaceUsage(w, rows, by);
      return this.result(kind, parsed.weeks, [...byWeek.values()].flat(), match);
    }
    const target = week ? parseWeek(week) : mondayOf(this.clock.now());
    const rows: WeeklyTicketRecord[] = parseTicketsCsv(csv).map((r) => {
      const m = match(r.operatorName);
      return { ...r, week: target, nameKey: m.key, accountId: m.accountId };
    });
    await this.store.replaceTickets(target, rows, by);
    return this.result(kind, [target], rows, match);
  }

  /**
   * The weekly BigQuery sync (bigquery/weekly-sync.gs): feature usage per operator for one Monday-start week, replacing
   * that week's usage rows. Same name matching as the CSV upload; the WAO categories fill the same seven flags.
   */
  async ingestUsage(payload: unknown, by: string): Promise<IngestResult> {
    const p = (payload ?? {}) as { week?: unknown; rows?: unknown };
    if (typeof p.week !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(p.week) || mondayOfIso(p.week) !== p.week) throw new WeeklyDataError('week must be a Monday, YYYY-MM-DD');
    if (!Array.isArray(p.rows) || !p.rows.length) throw new WeeklyDataError('rows must be a non-empty list');
    if (p.rows.length > MAX_INGEST_ROWS) throw new WeeklyDataError(`At most ${MAX_INGEST_ROWS} operators per week`);
    const match = await this.matcher();
    const unknown = new Set<string>();
    const records = new Map<string, WeeklyUsageRecord>();
    for (const raw of p.rows as Partial<UsageIngestRow>[]) {
      const name = cleanName(typeof raw.operatorName === 'string' ? raw.operatorName : '');
      if (!name || !Number.isInteger(raw.operatorId)) throw new WeeklyDataError('Every row needs operatorId (integer) and operatorName');
      const features = Object.fromEntries(FEATURES.map((f) => [f, false])) as Record<Feature, boolean>;
      for (const c of Array.isArray(raw.categories) ? raw.categories : []) {
        const category = CATEGORY_CODES[c as keyof typeof CATEGORY_CODES];
        if (category) features[category] = true;
      }
      const featureUsage: Record<string, FeatureActivity> = {};
      for (const [code, a] of Object.entries(raw.features ?? {})) {
        if (!featureByCode(code)) {
          unknown.add(code);
          continue;
        }
        const events = Math.max(0, Math.round(Number(a?.events)));
        const days = Math.min(7, Math.max(0, Math.round(Number(a?.days))));
        if (Number.isFinite(events) && Number.isFinite(days) && events > 0) featureUsage[code] = { events, days };
      }
      const m = match(name);
      records.set(name, {
        week: p.week,
        operatorName: name,
        nameKey: m.key,
        accountId: m.accountId,
        features,
        featureCount: FEATURES.filter((f) => features[f]).length,
        operatorId: raw.operatorId as number,
        featureUsage,
      });
    }
    const rows = [...records.values()];
    await this.store.replaceUsage(p.week, rows, by);
    return { ...this.result('usage', [p.week], rows, match), unknownFeatures: [...unknown].sort() };
  }

  /**
   * The weekly BigQuery sync of tickets sold (dwh.fact_operator_tickets_actual_vs_target, summed per Monday-start week),
   * replacing that week's tickets rows. Operators that sold nothing are simply absent (no row = no sales).
   */
  async ingestTickets(payload: unknown, by: string): Promise<UploadResult> {
    const p = (payload ?? {}) as { week?: unknown; rows?: unknown };
    if (typeof p.week !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(p.week) || mondayOfIso(p.week) !== p.week) throw new WeeklyDataError('week must be a Monday, YYYY-MM-DD');
    if (!Array.isArray(p.rows)) throw new WeeklyDataError('rows must be a list');
    if (p.rows.length > MAX_INGEST_ROWS) throw new WeeklyDataError(`At most ${MAX_INGEST_ROWS} operators per week`);
    const match = await this.matcher();
    const records = new Map<string, WeeklyTicketRecord>();
    for (const raw of p.rows as { operatorId?: unknown; operatorName?: unknown; tickets?: unknown }[]) {
      const name = cleanName(typeof raw.operatorName === 'string' ? raw.operatorName : '');
      const tickets = Math.round(Number(raw.tickets));
      if (!name || !Number.isFinite(tickets) || tickets < 0) throw new WeeklyDataError('Every row needs operatorName and tickets (a number, 0 or more)');
      if (tickets === 0) continue;
      const m = match(name);
      records.set(name, { week: p.week, operatorName: name, nameKey: m.key, accountId: m.accountId, gmvUsd: 0, tickets });
    }
    const rows = [...records.values()];
    await this.store.replaceTickets(p.week, rows, by);
    return this.result('tickets', [p.week], rows, match);
  }

  /**
   * The BigQuery price comparison: per operator and currency, the ticket-weighted price difference vs other operators on
   * the same route + vehicle type + vehicle class, with the segments that differ most. A snapshot: replaces the previous one.
   */
  async ingestPricing(payload: unknown, by: string): Promise<{ rows: number; matched: number }> {
    const p = (payload ?? {}) as { windowDays?: unknown; rows?: unknown };
    const windowDays = Math.round(Number(p.windowDays));
    if (!Number.isFinite(windowDays) || windowDays < 1 || windowDays > 366) throw new WeeklyDataError('windowDays must be 1–366');
    if (!Array.isArray(p.rows)) throw new WeeklyDataError('rows must be a list');
    if (p.rows.length > MAX_INGEST_ROWS) throw new WeeklyDataError(`At most ${MAX_INGEST_ROWS} rows`);
    const match = await this.matcher();
    const num = (v: unknown, what: string): number => {
      const n = Number(v);
      if (!Number.isFinite(n)) throw new WeeklyDataError(`${what} must be a number`);
      return n;
    };
    const computedAt = this.clock.now().toISOString();
    const records = new Map<string, PricingRecord>();
    for (const raw of p.rows as Record<string, unknown>[]) {
      const name = cleanName(typeof raw.operatorName === 'string' ? raw.operatorName : '');
      const currency = typeof raw.currency === 'string' ? raw.currency.trim().toUpperCase() : '';
      if (!name || !currency || !Number.isInteger(raw.operatorId)) throw new WeeklyDataError('Every row needs operatorId (integer), operatorName and currency');
      const detail: PricingSegment[] = (Array.isArray(raw.detail) ? raw.detail : []).slice(0, 20).map((d: Record<string, unknown>) => ({
        from: String(d.from ?? ''),
        to: String(d.to ?? ''),
        vehicleType: String(d.vehicleType ?? ''),
        vehicleClass: String(d.vehicleClass ?? ''),
        tickets: Math.round(num(d.tickets, 'detail.tickets')),
        avgPrice: num(d.avgPrice, 'detail.avgPrice'),
        peerAvgPrice: num(d.peerAvgPrice, 'detail.peerAvgPrice'),
        peers: Math.round(num(d.peers, 'detail.peers')),
        pct: num(d.pct, 'detail.pct'),
      }));
      const m = match(name);
      records.set(`${raw.operatorId}|${currency}`, {
        operatorName: name,
        nameKey: m.key,
        accountId: m.accountId,
        operatorId: raw.operatorId as number,
        currency,
        ticketsCompared: Math.round(num(raw.ticketsCompared, 'ticketsCompared')),
        segments: Math.round(num(raw.segments, 'segments')),
        pricePct: Math.round(num(raw.pricePct, 'pricePct') * 100) / 100,
        windowDays,
        detail,
        computedAt,
      });
    }
    const rows = [...records.values()];
    await this.store.replacePricing(rows, by);
    return { rows: rows.length, matched: rows.filter((r) => r.accountId).length };
  }

  /** Uploads so far, names still unmatched in the latest weeks, and the accounts they can be matched to. */
  async summary() {
    const [uploads, links, accounts, usage, tickets] = await Promise.all([this.store.uploads(20), this.store.nameLinks(), this.accounts(), this.store.usageWeek(), this.store.ticketsWeek()]);
    const unmatched = new Map<string, { name: string; key: string; in: WeeklyKind[] }>();
    for (const [kind, rows] of [['usage', usage], ['tickets', tickets]] as const) {
      for (const r of rows) {
        if (r.accountId || links.has(r.nameKey)) continue;
        const u = unmatched.get(r.nameKey) ?? { name: r.operatorName, key: r.nameKey, in: [] };
        unmatched.set(r.nameKey, { ...u, in: [...u.in, kind] });
      }
    }
    return {
      uploads,
      unmatched: [...unmatched.values()].sort((a, b) => a.name.localeCompare(b.name)),
      ignored: [...links].filter(([, id]) => id === null).map(([key]) => key),
      accounts: accounts.map((a) => ({ id: a.id, name: a.name })).sort((a, b) => a.name.localeCompare(b.name)),
    };
  }

  /** A person matches an uploaded name to an account (or `null` = not an operator we track), for this and later weeks. */
  async link(name: string, accountId: string | null, by: string): Promise<void> {
    if (accountId && !(await this.accounts()).some((a) => a.id === accountId)) throw new WeeklyDataError(`Account ${accountId} is not in the latest run`);
    const key = nameKey(name);
    if (!key) throw new WeeklyDataError('Name is empty');
    await this.store.setNameLink(key, accountId, by);
  }

  /** The latest `weeks` weeks for one account, newest first. */
  async forAccount(accountId: string, weeks = 12): Promise<{ usage: UsageWithFeatures[]; tickets: TicketsView[]; usageWeeks: string[]; pricing: PricingRecord[]; pricingSyncedAt: string | null }> {
    const [usage, tickets, usageWeeks, pricing, pricingSyncedAt] = await Promise.all([
      this.store.usageFor(accountId, weeks),
      this.store.ticketsFor(accountId, weeks),
      this.store.usageWeeks(weeks),
      this.store.pricingFor(accountId),
      this.store.pricingSyncedAt(),
    ]);
    // usageWeeks: weeks the sync delivered for anyone. The sync sends operators that had tracked events, so an account
    // without a usage row in one of those weeks was inactive in the SeatOS app (WAO 0/7), not "unknown".
    return { usage: usage.map(withFeatureNames), tickets: tickets.map(withoutGmv), usageWeeks, pricing, pricingSyncedAt };
  }

  /**
   * Accounts that sold no tickets in the last two weeks that have ticket data (the current and the previous week):
   * the sync only lists operators that sold something, so no row means zero tickets. Empty until ticket data exists, so
   * nobody is labelled "zero ticket" just because nothing has arrived yet.
   */
  async zeroTickets(): Promise<{ weeks: string[]; accountIds: string[] }> {
    const weeks = await this.store.ticketWeeks(2);
    if (!weeks.length) return { weeks: [], accountIds: [] };
    const sold = new Set((await Promise.all(weeks.map((w) => this.store.ticketsWeek(w)))).flat().map((r) => r.accountId));
    return { weeks, accountIds: (await this.accounts()).filter((a) => !sold.has(a.id)).map((a) => a.id) };
  }

  /**
   * WAO of the latest week with usage data: the accounts that used at least 3 of the 7 categories (the WAO rule), so the
   * Home page can show them as a share of the accounts in view.
   */
  async waoOverview(): Promise<{ week: string | null; accountIds: string[] }> {
    const rows = await this.store.usageWeek();
    return { week: rows[0]?.week ?? null, accountIds: rows.filter((r) => r.accountId && r.featureCount >= WAO_MIN_CATEGORIES).map((r) => r.accountId as string) };
  }

  /**
   * Who used a feature over the last four weeks of usage data: one entry per operator with its events and active days
   * in each week, most active first. A week only counts at 3 or more events (active); less is not use. Without a feature code only the picker (features and weeks) comes back.
   */
  async featureUsage(code?: string): Promise<FeatureUsageView> {
    const weeks = await this.store.usageWeeks(FEATURE_WEEKS);
    const features = SEATOS_FEATURES.filter((f) => f.module !== 'System / Platform').map(({ code, name, module }) => ({ code, name, module }));
    if (!code) return { weeks, features, feature: null, operators: [] };
    if (!featureByCode(code)) throw new WeeklyDataError(`Unknown feature ${code}`);
    const operators = new Map<string, FeatureUsageView['operators'][number]>();
    for (const w of weeks) {
      for (const r of await this.store.usageWeek(w)) {
        const a = r.featureUsage?.[code];
        if (!a || a.events < ACTIVE_FEATURE_EVENTS) continue;
        const o = operators.get(r.nameKey) ?? { operatorName: r.operatorName, accountId: r.accountId, byWeek: {}, events: 0, activeWeeks: 0 };
        o.byWeek[w] = { events: a.events, days: a.days };
        o.events += a.events;
        o.activeWeeks += 1;
        operators.set(r.nameKey, o);
      }
    }
    return { weeks, features, feature: code, operators: [...operators.values()].sort((x, y) => y.events - x.events || x.operatorName.localeCompare(y.operatorName)) };
  }

  /** Every operator in one week (the latest when omitted). */
  async week(kind: WeeklyKind, week?: string) {
    const w = week ? parseWeek(week) : undefined;
    return kind === 'usage' ? (await this.store.usageWeek(w)).map(withFeatureNames) : (await this.store.ticketsWeek(w)).map(withoutGmv);
  }

  private result(kind: WeeklyKind, weeks: string[], rows: readonly { operatorName: string; accountId: string | null; nameKey: string }[], match: ReturnType<WeeklyDataService['matcherSync']>): UploadResult {
    const unmatched = rows.filter((r) => !r.accountId && !match.ignored(r.nameKey)).map((r) => ({ name: r.operatorName, key: r.nameKey }));
    return { kind, weeks, rows: rows.length, matched: rows.filter((r) => r.accountId).length, unmatched };
  }

  private async matcher() {
    const [accounts, links] = await Promise.all([this.accounts(), this.store.nameLinks()]);
    return this.matcherSync(accounts, links);
  }

  /** Hand-made links first (they may also say "ignore"), then an exact normalised-name match with an account. */
  private matcherSync(accounts: readonly CrmAccount[], links: ReadonlyMap<string, string | null>) {
    const byKey = new Map<string, string>();
    for (const a of accounts) {
      const key = nameKey(a.name);
      if (key && !byKey.has(key)) byKey.set(key, a.id);
    }
    const match = (name: string) => {
      const key = nameKey(cleanName(name));
      const accountId = links.has(key) ? (links.get(key) ?? null) : (byKey.get(key) ?? null);
      return { key, accountId };
    };
    return Object.assign(match, { ignored: (key: string) => links.has(key) && links.get(key) === null });
  }

  private async accounts(): Promise<CrmAccount[]> {
    const run = await this.runs.latestRun();
    if (!run) return [];
    return [...(await this.runs.operatorsForRun(run.id)).snapshot.accounts];
  }
}

/** Feature codes → names (most used first); system features (login, flags, settings) are not product usage, so they stay out. */
function withFeatureNames(r: WeeklyUsageRecord): UsageWithFeatures {
  const featureUsage = Object.entries(r.featureUsage ?? {})
    .flatMap(([code, a]) => {
      const f = featureByCode(code);
      return f && f.module !== 'System / Platform' ? [{ code, name: f.name, module: f.module, events: a.events, days: a.days }] : [];
    })
    .sort((a, b) => b.events - a.events || a.name.localeCompare(b.name));
  return { ...r, featureUsage };
}

const mondayOfIso = (iso: string): string => mondayOf(new Date(`${iso}T12:00:00Z`), 'UTC');

const withoutGmv = ({ gmvUsd: _gmv, ...rest }: WeeklyTicketRecord): TicketsView => rest;
