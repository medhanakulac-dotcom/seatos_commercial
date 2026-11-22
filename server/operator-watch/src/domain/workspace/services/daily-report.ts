import { DailyRecord } from '../types/repositories/workspace.ports';

const WAO_MIN = 3;
const CATEGORY_LABEL: Record<string, string> = {
  inventory_management: 'Inventory',
  distribution_management: 'Distribution',
  reservation_management: 'Reservation',
  trip_management: 'Trip',
  fleet_management: 'Fleet',
  analytics: 'Analytics',
  accounting: 'Accounting',
};

const addDays = (iso: string, n: number) => new Date(new Date(`${iso}T00:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);
const keyOf = (r: DailyRecord) => r.accountId ?? `name:${r.nameKey}`;
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : 0);
const pp = (a: number, b: number) => Math.round((a - b) * 10) / 10;

interface Win {
  /** Operators in the base on the window's last day, with the categories they used across the 7 days. */
  base: Map<string, { operator: string; country: string | null; categories: Set<string> }>;
}

/** The 7 days ending on `day` (the report's "last 7 days"): the base is the live API-booking operators of `day` that were active in those days. */
function window7(rows: readonly DailyRecord[], day: string): Win {
  const from = addDays(day, -6);
  const base = new Map<string, { operator: string; country: string | null; categories: Set<string> }>();
  const active = new Set<string>();
  for (const r of rows) if (r.day === day && r.inBase) base.set(keyOf(r), { operator: r.operatorName, country: r.country, categories: new Set() });
  for (const r of rows) {
    if (r.day < from || r.day > day) continue;
    const b = base.get(keyOf(r));
    if (!b) continue;
    for (const c of r.categories) b.categories.add(c);
    if (r.sessions > 0 || r.actions > 0) active.add(keyOf(r));
  }
  // The WAO base is the live API-booking operators that were active in the window (as the WAO definition says).
  for (const k of [...base.keys()]) if (!active.has(k)) base.delete(k);
  return { base };
}

const waoOf = (w: Win) => [...w.base.values()].filter((o) => o.categories.size >= WAO_MIN);

function dayTotals(rows: readonly DailyRecord[], day: string) {
  const r = rows.filter((x) => x.day === day);
  const ops = new Set(r.filter((x) => x.sessions > 0 || x.actions > 0).map(keyOf));
  const logged = new Set(r.filter((x) => x.logins > 0).map(keyOf));
  return { operators_active: ops.size, operators_logged_in: logged.size, login_events: r.reduce((n, x) => n + x.logins, 0), sessions: r.reduce((n, x) => n + x.sessions, 0) };
}

/** The numbers of the daily "November Release" Slack report for one day, so every line of it can be answered and explained. */
export function dailyReport(rows: readonly DailyRecord[], day: string) {
  const weekAgo = addDays(day, -7);
  const w = window7(rows, day);
  const wPrev = window7(rows, addDays(day, -1));
  const wPre = window7(rows, weekAgo);
  const wao = waoOf(w);
  const waoPct = pct(wao.length, w.base.size);
  const prePct = pct(waoOf(wPre).length, wPre.base.size);
  const prevPct = pct(waoOf(wPrev).length, wPrev.base.size);

  const preDays = Array.from({ length: 7 }, (_, i) => addDays(day, -7 + i));
  const preTotals = preDays.map((d) => dayTotals(rows, d));
  const avg = (f: (t: ReturnType<typeof dayTotals>) => number) => preTotals.reduce((n, t) => n + f(t), 0) / preTotals.length;
  const t = dayTotals(rows, day);
  const vs = (now: number, base: number) => (base ? Math.round(((now - base) / base) * 100) : null);

  const cats = Object.entries(CATEGORY_LABEL).map(([key, label]) => {
    const now = pct([...w.base.values()].filter((o) => o.categories.has(key)).length, w.base.size);
    const pre = pct([...wPre.base.values()].filter((o) => o.categories.has(key)).length, wPre.base.size);
    return { category: label, share_of_operators_pct: now, change_vs_week_ago_pp: pp(now, pre) };
  });

  const countries = new Map<string, { base: number; wao: number }>();
  for (const o of w.base.values()) {
    const c = o.country ?? 'Unknown';
    const e = countries.get(c) ?? { base: 0, wao: 0 };
    e.base += 1;
    if (o.categories.size >= WAO_MIN) e.wao += 1;
    countries.set(c, e);
  }
  const preCountries = new Map<string, { base: number; wao: number }>();
  for (const o of wPre.base.values()) {
    const c = o.country ?? 'Unknown';
    const e = preCountries.get(c) ?? { base: 0, wao: 0 };
    e.base += 1;
    if (o.categories.size >= WAO_MIN) e.wao += 1;
    preCountries.set(c, e);
  }

  const wasWao = new Set([...wPrev.base].filter(([, o]) => o.categories.size >= WAO_MIN).map(([k]) => k));
  const isWao = new Set([...w.base].filter(([, o]) => o.categories.size >= WAO_MIN).map(([k]) => k));
  const crossedIn = [...isWao].filter((k) => !wasWao.has(k) && wPrev.base.has(k)).map((k) => w.base.get(k)!.operator);
  const slipped = [...wasWao].filter((k) => !isWao.has(k) && w.base.has(k)).map((k) => w.base.get(k)!.operator);

  return {
    day,
    note: 'WAO here is a rolling 7 days ending that day (operators in the base using 3+ of 7 categories across the 7 days). Changes compare with the 7-day window ending ' + weekAgo + ' (a week earlier) and, for the scoreboard, the daily average of the 7 days before.',
    wao: { pct: waoPct, operators: wao.length, base: w.base.size, change_vs_week_ago_pp: pp(waoPct, prePct), change_vs_previous_day_pp: pp(waoPct, prevPct) },
    scoreboard_vs_previous_7_days_daily_average: {
      operators_active: { value: t.operators_active, change_pct: vs(t.operators_active, avg((x) => x.operators_active)) },
      logins: { value: t.login_events, change_pct: vs(t.login_events, avg((x) => x.login_events)), operators_who_logged_in: t.operators_logged_in },
      sessions: { value: t.sessions, change_pct: vs(t.sessions, avg((x) => x.sessions)) },
    },
    categories_last_7_days: cats.sort((a, b) => b.change_vs_week_ago_pp - a.change_vs_week_ago_pp),
    wao_by_country_last_7_days: [...countries.entries()]
      .map(([country, e]) => ({ country, wao_pct: pct(e.wao, e.base), operators: e.base, change_vs_week_ago_pp: pp(pct(e.wao, e.base), pct(preCountries.get(country)?.wao ?? 0, preCountries.get(country)?.base ?? 0)) }))
      .sort((a, b) => b.operators - a.operators),
    crossed_into_wao_that_day: crossedIn,
    slipped_below_wao_that_day: slipped,
  };
}
