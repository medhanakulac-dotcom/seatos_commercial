/**
 * Calendar maths in the configured timezone (no DST handling needed for Asia/Bangkok, but the
 * helpers work for any IANA zone by reading wall-clock parts through Intl).
 */
const DAY_MS = 864e5;
const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

interface WallClock {
  year: number;
  month: number;
  day: number;
  weekday: number;
  minutes: number;
}

export function wallClock(at: Date, timeZone: string): WallClock {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  return { year: +parts.year, month: +parts.month, day: +parts.day, weekday: WEEKDAYS[parts.weekday], minutes: +parts.hour * 60 + +parts.minute };
}

const toMinutes = (hhmm: string) => +hhmm.slice(0, 2) * 60 + +hhmm.slice(3, 5);
const ymd = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/** Offset (ms) of `timeZone` from UTC at `at`. */
function offsetMs(at: Date, timeZone: string): number {
  const w = wallClock(at, timeZone);
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, Math.floor(w.minutes / 60), w.minutes % 60);
  return asUtc - Math.floor(at.getTime() / 60000) * 60000;
}

/** The UTC instant of a local wall-clock time. */
export function zonedInstant(dateYmd: string, hhmm: string, timeZone: string): Date {
  const [y, m, d] = dateYmd.split('-').map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, +hhmm.slice(0, 2), +hhmm.slice(3, 5)));
  return new Date(guess.getTime() - offsetMs(guess, timeZone));
}

/** ISO-8601 week label (e.g. `2026-W40`) for a local calendar date. */
export function isoWeek(dateYmd: string): string {
  const [y, m, d] = dateYmd.split('-').map(Number);
  const date = Date.UTC(y, m - 1, d);
  const weekday = (new Date(date).getUTCDay() + 6) % 7;
  const thursday = new Date(date - weekday * DAY_MS + 3 * DAY_MS);
  const year = thursday.getUTCFullYear();
  const week = Math.ceil(((thursday.getTime() - Date.UTC(year, 0, 1)) / DAY_MS + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export interface Cadence {
  cadence: 'daily' | 'weekly';
  weekday: number;
  time: string;
  timezone: string;
}

/**
 * The most recent scheduled slot at or before `now`: its unique period key (for idempotent runs),
 * a human label and the instant it opened.
 */
export function currentPeriod(now: Date, c: Cadence): { key: string; label: string; opensAt: Date } {
  const w = wallClock(now, c.timezone);
  const slot = toMinutes(c.time);
  let back = 0;
  if (c.cadence === 'daily') back = w.minutes >= slot ? 0 : 1;
  else {
    back = (w.weekday - c.weekday + 7) % 7;
    if (back === 0 && w.minutes < slot) back = 7;
  }
  const base = new Date(Date.UTC(w.year, w.month - 1, w.day) - back * DAY_MS);
  const date = ymd(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate());
  const label = c.cadence === 'daily' ? date : isoWeek(date);
  return { key: `${c.cadence}:${date}@${c.time}`, label, opensAt: zonedInstant(date, c.time, c.timezone) };
}

/** Next occurrence of weekday/time (in `timeZone`) at or after `now`. */
export function nextSlot(now: Date, weekday: number, hhmm: string, timeZone: string): Date {
  const w = wallClock(now, timeZone);
  let ahead = (weekday - w.weekday + 7) % 7;
  if (ahead === 0 && w.minutes > toMinutes(hhmm)) ahead = 7;
  const base = new Date(Date.UTC(w.year, w.month - 1, w.day) + ahead * DAY_MS);
  return zonedInstant(ymd(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate()), hhmm, timeZone);
}

export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
