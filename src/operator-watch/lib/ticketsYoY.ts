const DAY_MS = 86_400_000;

/** The Monday `weeks` weeks after (negative: before) the Monday `iso`, YYYY-MM-DD. */
export const shiftWeeks = (iso: string, weeks: number): string =>
  new Date(Date.parse(`${iso}T12:00:00Z`) + weeks * 7 * DAY_MS).toISOString().slice(0, 10);

/** The same week a year earlier: 52 weeks back, so Monday stays Monday. */
export const yearAgo = (iso: string): string => shiftWeeks(iso, -52);

export const mondayOf = (now: Date): string =>
  new Date(now.getTime() - ((now.getUTCDay() + 6) % 7) * DAY_MS).toISOString().slice(0, 10);

export interface TicketsPeriod {
  weeks: number;
  /** The Monday of the newest week in the period. */
  to: string;
  tickets: number;
  lastYear: number;
  /** Percent change vs last year; null when last year had no tickets. */
  pct: number | null;
}

export const pctChange = (now: number, before: number): number | null => (before ? Math.round(((now - before) / before) * 1000) / 10 : null);

/**
 * Tickets over the last 4, 13 and 52 finished weeks vs the same weeks a year earlier. `delivered` are the weeks the data feed
 * covered (no row in a delivered week = 0 tickets). A period is left out unless both years are fully covered, and the week
 * still running is never counted.
 */
export function ticketsPeriods(tickets: readonly { week: string; tickets: number }[], delivered: readonly string[], now: Date): TicketsPeriod[] {
  const sold = new Map(tickets.map((t) => [t.week, t.tickets]));
  const have = new Set(delivered);
  const last = [...have].filter((w) => w < mondayOf(now)).sort().at(-1);
  if (!last) return [];
  const out: TicketsPeriod[] = [];
  for (const n of [4, 13, 52]) {
    const weeks = Array.from({ length: n }, (_, i) => shiftWeeks(last, -i));
    const before = weeks.map(yearAgo);
    if (!weeks.every((w) => have.has(w)) || !before.every((w) => have.has(w))) continue;
    const sum = (ws: string[]) => ws.reduce((a, w) => a + (sold.get(w) ?? 0), 0);
    const t = sum(weeks);
    const y = sum(before);
    out.push({ weeks: n, to: last, tickets: t, lastYear: y, pct: pctChange(t, y) });
  }
  return out;
}
