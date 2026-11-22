import { DailyRecord } from '../types/repositories/workspace.ports';

const BASELINE_DAYS = 14;
/** An operator counts as a regular (so its silence is news) when it logged in on at least this many of the baseline days. */
const REGULAR_LOGIN_DAYS = 3;
/** A drop is reported when the day's actions are at most this share of the operator's typical day, and the typical day was not tiny. */
const DROP_RATIO = 0.5;
const DROP_MIN_TYPICAL = 20;
const LIST_MAX = 40;

const addDays = (iso: string, n: number) => new Date(new Date(`${iso}T00:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);
const weekday = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay();

interface Merged {
  operator: string;
  accountId: string | null;
  logins: number;
  actions: number;
  categories: Set<string>;
  features: Record<string, number>;
}

/** One entry per operator and day (an account's aliases are merged), keyed by operator then day. */
function group(rows: readonly DailyRecord[]): Map<string, { operator: string; accountId: string | null; days: Map<string, Merged> }> {
  const out = new Map<string, { operator: string; accountId: string | null; days: Map<string, Merged> }>();
  for (const r of rows) {
    const key = r.accountId ?? `name:${r.nameKey}`;
    const o = out.get(key) ?? { operator: r.operatorName, accountId: r.accountId, days: new Map<string, Merged>() };
    const d = o.days.get(r.day) ?? { operator: r.operatorName, accountId: r.accountId, logins: 0, actions: 0, categories: new Set<string>(), features: {} };
    d.logins += r.logins;
    d.actions += r.actions;
    for (const c of r.categories) d.categories.add(c);
    for (const [code, n] of Object.entries(r.features)) d.features[code] = (d.features[code] ?? 0) + n;
    o.days.set(r.day, d);
    out.set(key, o);
  }
  return out;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** What a normal day looks like for this operator: the same weekday in the baseline when it has two or more, else every baseline day. */
function typical(days: Map<string, Merged>, target: string): { actions: number; features: Record<string, number> } {
  const base: string[] = [];
  for (let i = 1; i <= BASELINE_DAYS; i++) base.push(addDays(target, -i));
  const sameWeekday = base.filter((d) => weekday(d) === weekday(target));
  const chosen = sameWeekday.length >= 2 ? sameWeekday : base;
  const at = (d: string) => days.get(d);
  const features: Record<string, number> = {};
  for (const code of new Set(chosen.flatMap((d) => Object.keys(at(d)?.features ?? {})))) features[code] = mean(chosen.map((d) => at(d)?.features[code] ?? 0));
  return { actions: mean(chosen.map((d) => at(d)?.actions ?? 0)), features };
}

/** Who did not log in and who dropped, on one day, against each operator's own recent pattern. */
export function dailyOverview(rows: readonly DailyRecord[], target: string, featureName: (code: string) => string) {
  const ops = [...group(rows).values()];
  const baseDays = Array.from({ length: BASELINE_DAYS }, (_, i) => addDays(target, -(i + 1)));
  const available = new Set(rows.map((r) => r.day));
  const noLogin: unknown[] = [];
  const dropped: { change: number; row: unknown }[] = [];
  let activeToday = 0;
  let loggedIn = 0;
  for (const o of ops) {
    const day = o.days.get(target);
    const loginDays = baseDays.filter((d) => (o.days.get(d)?.logins ?? 0) > 0);
    if ((day?.actions ?? 0) > 0) activeToday += 1;
    if ((day?.logins ?? 0) > 0) loggedIn += 1;
    const lastLogin = [...o.days.entries()].filter(([d, v]) => d < target && v.logins > 0).map(([d]) => d).sort().pop() ?? null;
    if ((day?.logins ?? 0) === 0 && loginDays.length >= REGULAR_LOGIN_DAYS) {
      noLogin.push({ operator: o.operator, operator_id: o.accountId, usually_logs_in_days_of_last_14: loginDays.length, last_login_day: lastLogin, actions_that_day: day?.actions ?? 0 });
      continue;
    }
    const t = typical(o.days, target);
    const actions = day?.actions ?? 0;
    if ((day?.logins ?? 0) > 0 && t.actions >= DROP_MIN_TYPICAL && actions <= t.actions * DROP_RATIO) {
      const fell = Object.entries(t.features)
        .map(([code, usual]) => ({ code, usual, now: day?.features[code] ?? 0 }))
        .filter((f) => f.usual - f.now >= 5)
        .sort((a, b) => b.usual - b.now - (a.usual - a.now))
        .slice(0, 3)
        .map((f) => ({ feature: featureName(f.code), usual: Math.round(f.usual), now: f.now }));
      dropped.push({
        change: actions - t.actions,
        row: {
          operator: o.operator,
          operator_id: o.accountId,
          actions,
          typical_actions: Math.round(t.actions),
          change_pct: Math.round(((actions - t.actions) / t.actions) * 100),
          categories_that_day: [...(day?.categories ?? [])],
          features_that_fell: fell,
        },
      });
    }
  }
  dropped.sort((a, b) => a.change - b.change);
  return {
    day: target,
    baseline_days_with_data: baseDays.filter((d) => available.has(d)).length,
    operators_that_logged_in: loggedIn,
    operators_with_actions: activeToday,
    no_login_but_usually_do: noLogin.sort((a: any, b: any) => b.usually_logs_in_days_of_last_14 - a.usually_logs_in_days_of_last_14).slice(0, LIST_MAX),
    no_login_total: noLogin.length,
    activity_dropped_at_least_half: dropped.slice(0, LIST_MAX).map((d) => d.row),
    activity_dropped_total: dropped.length,
  };
}

/** One operator, the last days: logins, actions and categories per day, plus how long it has been quiet. */
export function operatorTimeline(rows: readonly DailyRecord[], accountId: string, upTo: string, days = 14) {
  const o = [...group(rows.filter((r) => r.accountId === accountId)).values()][0];
  const timeline = Array.from({ length: days }, (_, i) => addDays(upTo, -(days - 1 - i))).map((d) => {
    const v = o?.days.get(d);
    return { day: d, weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][weekday(d)], logins: v?.logins ?? 0, actions: v?.actions ?? 0, categories: v ? [...v.categories] : [] };
  });
  let quiet = 0;
  for (let i = timeline.length - 1; i >= 0 && timeline[i].logins === 0; i--) quiet += 1;
  return { operator: o?.operator ?? null, days_without_login_in_a_row_up_to_that_day: quiet, timeline };
}
