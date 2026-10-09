import { Inject, Injectable } from '@nestjs/common';
import { CrmAccount } from '../entities/workspace.entities';
import { Clock, WEEKLY_DATA_STORE, WeeklyDataStore, WeeklyTicketRecord, WeeklyUsageRecord, WORKSPACE_CLOCK } from '../types/repositories/workspace.ports';
import { RunService } from './run.service';
import { cleanName, mondayOf, nameKey, parseTicketsCsv, parseUsageCsv, parseWeek, WeeklyDataError, WeeklyKind } from './weekly-data';

export interface UploadResult {
  readonly kind: WeeklyKind;
  readonly weeks: string[];
  readonly rows: number;
  readonly matched: number;
  /** Names that matched no account (and were not marked "ignore"): match them by hand once. */
  readonly unmatched: { name: string; key: string }[];
}

/**
 * The weekly numbers the team uploads every Sunday night: Looker's feature usage table (WAO) and tickets/GMV.
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
  async forAccount(accountId: string, weeks = 12) {
    const [usage, tickets] = await Promise.all([this.store.usageFor(accountId, weeks), this.store.ticketsFor(accountId, weeks)]);
    return { usage, tickets };
  }

  /** Every operator in one week (the latest when omitted). */
  async week(kind: WeeklyKind, week?: string) {
    const w = week ? parseWeek(week) : undefined;
    return kind === 'usage' ? this.store.usageWeek(w) : this.store.ticketsWeek(w);
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
