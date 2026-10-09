import { WeeklyDataStore, WeeklyTicketRecord, WeeklyUpload, WeeklyUsageRecord } from '../../domain/workspace/types/repositories/workspace.ports';

type Stamp = { uploadedAt: string; uploadedBy: string };

/** Dev/test-only weekly uploads: process-local, lost on restart. */
export class InMemoryWeeklyDataStore implements WeeklyDataStore {
  private usage: (WeeklyUsageRecord & Stamp)[] = [];
  private tickets: (WeeklyTicketRecord & Stamp)[] = [];
  private readonly links = new Map<string, string | null>();

  async replaceUsage(week: string, rows: readonly WeeklyUsageRecord[], by: string): Promise<void> {
    this.usage = [...this.usage.filter((r) => r.week !== week), ...dedupe(rows).map((r) => ({ ...r, week, uploadedAt: new Date().toISOString(), uploadedBy: by }))];
  }

  async replaceTickets(week: string, rows: readonly WeeklyTicketRecord[], by: string): Promise<void> {
    this.tickets = [...this.tickets.filter((r) => r.week !== week), ...dedupe(rows).map((r) => ({ ...r, week, uploadedAt: new Date().toISOString(), uploadedBy: by }))];
  }

  async usageFor(accountId: string, limit: number): Promise<WeeklyUsageRecord[]> {
    return this.usage.filter((r) => r.accountId === accountId).sort(byWeekDesc).slice(0, limit).map(strip);
  }

  async ticketsFor(accountId: string, limit: number): Promise<WeeklyTicketRecord[]> {
    return this.tickets.filter((r) => r.accountId === accountId).sort(byWeekDesc).slice(0, limit).map(strip);
  }

  async usageWeek(week?: string): Promise<WeeklyUsageRecord[]> {
    const w = week ?? latest(this.usage);
    return this.usage.filter((r) => r.week === w).sort((a, b) => b.featureCount - a.featureCount || a.operatorName.localeCompare(b.operatorName)).map(strip);
  }

  async ticketsWeek(week?: string): Promise<WeeklyTicketRecord[]> {
    const w = week ?? latest(this.tickets);
    return this.tickets.filter((r) => r.week === w).sort((a, b) => b.tickets - a.tickets || a.operatorName.localeCompare(b.operatorName)).map(strip);
  }

  async uploads(limit: number): Promise<WeeklyUpload[]> {
    const groups = new Map<string, WeeklyUpload>();
    for (const [kind, rows] of [['usage', this.usage], ['tickets', this.tickets]] as const) {
      for (const r of rows) {
        const key = `${r.week}|${kind}`;
        const g = groups.get(key) ?? { kind, week: r.week, rows: 0, matched: 0, uploadedAt: r.uploadedAt, uploadedBy: r.uploadedBy };
        groups.set(key, { ...g, rows: g.rows + 1, matched: g.matched + (r.accountId ? 1 : 0) });
      }
    }
    return [...groups.values()].sort((a, b) => b.week.localeCompare(a.week) || a.kind.localeCompare(b.kind)).slice(0, limit);
  }

  async nameLinks(): Promise<Map<string, string | null>> {
    return new Map(this.links);
  }

  async setNameLink(nameKey: string, accountId: string | null): Promise<void> {
    this.links.set(nameKey, accountId);
    this.usage = this.usage.map((r) => (r.nameKey === nameKey ? { ...r, accountId } : r));
    this.tickets = this.tickets.map((r) => (r.nameKey === nameKey ? { ...r, accountId } : r));
  }
}

const byWeekDesc = (a: { week: string }, b: { week: string }) => b.week.localeCompare(a.week);
const latest = (rows: readonly { week: string }[]) => rows.map((r) => r.week).sort().at(-1);
const strip = <T extends Stamp>({ uploadedAt: _a, uploadedBy: _b, ...rest }: T) => rest;
/** Same operator twice in one file: the last row wins (as the Postgres upsert does). */
const dedupe = <T extends { operatorName: string }>(rows: readonly T[]) => [...new Map(rows.map((r) => [r.operatorName, r])).values()];
