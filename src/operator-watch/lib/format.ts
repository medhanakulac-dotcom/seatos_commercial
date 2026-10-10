import type { AccountSummary, Health } from '../api/types';

export const ownerName = (owner: string | null): string => owner ?? 'Unassigned';

export const initials = (name: string): string =>
  name
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

export const plural = (n: number, word: string, many = `${word}s`): string => `${n} ${n === 1 ? word : many}`;

export const money = (n: number | null): string | null => (n == null ? null : `$${n.toLocaleString()}`);

export const pct = (a: number, b: number): number => (b ? Math.round((a / b) * 100) : 0);

export const HEALTH_COLORS: Record<Health, string> = { Unhealthy: '#cc3f6e', Adopted: '#c98a2b', Healthy: '#3f9a5b' };

export const byPriority = (a: AccountSummary, b: AccountSummary): number => a.priority - b.priority || a.name.localeCompare(b.name);

/** Owners ordered by how many accounts they hold, most first. */
export function ownersByLoad(accounts: AccountSummary[]): (string | null)[] {
  const counts = new Map<string | null, number>();
  for (const a of accounts) counts.set(a.owner, (counts.get(a.owner) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([owner]) => owner);
}

/** `<select>` values can't be null; unassigned owners travel as this token. */
export const UNASSIGNED = '__unassigned__';
export const ownerKey = (owner: string | null): string => owner ?? UNASSIGNED;
export const ownerFromKey = (key: string): string | null => (key === UNASSIGNED ? null : key);

const TZ = 'Asia/Bangkok';
const weekdayTime = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
const dateTime = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });

/**
 * Timeline stamps in the portal timezone: "Just now", "Mon 05:00" within the last 6 days,
 * otherwise a full date. CRM facts that only carry a day are shown as that day.
 */
export function formatEventTime(at: string, now: Date = new Date()): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(at)) return at;
  const t = new Date(at);
  const age = now.getTime() - t.getTime();
  if (age < 60_000) return 'Just now';
  if (age < 6 * 864e5) return weekdayTime.format(t).replace(',', '');
  return dateTime.format(t).replace(',', '');
}

export function greeting(now: Date = new Date()): string {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false }).format(now));
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

const sendSlot = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });

/** A send time in Bangkok time, e.g. "Tue 06 Oct 09:00". */
export const formatSendTime = (iso: string): string => sendSlot.format(new Date(iso)).replace(',', '');
