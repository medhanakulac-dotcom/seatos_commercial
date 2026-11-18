import { FEATURES, Feature } from './weekly-data';

/** What the insight functions need from a weekly usage row (UsageWithFeatures satisfies it). */
export interface InsightRow {
  readonly week: string;
  readonly operatorName: string;
  readonly accountId: string | null;
  readonly nameKey: string;
  readonly features: Readonly<Record<Feature, boolean>>;
  readonly featureCount: number;
  readonly featureUsage: readonly { code: string; name: string; module: string; events: number; days: number }[];
}

/** WAO: at least this many of the 7 categories in a week. A feature is "used" from this many events. */
const WAO_MIN = 3;
const FEATURE_MIN_EVENTS = 3;
const LIST_MAX = 15;

const label = (category: string) => category.replace(/_management$/, '').replace(/^./, (c) => c.toUpperCase());

interface Folded {
  readonly operator: string;
  readonly accountId: string | null;
  readonly categories: Set<Feature>;
  readonly features: Map<string, { name: string; module: string; events: number; days: number }>;
}

/** One entry per operator (an account's aliases are merged): categories used and features with at least 3 events. */
function fold(rows: readonly InsightRow[]): Map<string, Folded> {
  const out = new Map<string, Folded>();
  for (const r of rows) {
    const key = r.accountId ?? `name:${r.nameKey}`;
    const f = out.get(key) ?? { operator: r.operatorName, accountId: r.accountId, categories: new Set<Feature>(), features: new Map() };
    for (const c of FEATURES) if (r.features[c]) f.categories.add(c);
    for (const u of r.featureUsage) {
      const cur = f.features.get(u.code) ?? { name: u.name, module: u.module, events: 0, days: 0 };
      cur.events += u.events;
      cur.days = Math.max(cur.days, u.days);
      f.features.set(u.code, cur);
    }
    out.set(key, f);
  }
  return out;
}

const usedFeatures = (f: Folded | undefined) => new Map([...(f?.features ?? [])].filter(([, v]) => v.events >= FEATURE_MIN_EVENTS));
const isWao = (f: Folded | undefined) => !!f && f.categories.size >= WAO_MIN;

/** Adoption across everyone in one week: which features and categories the most operators used. */
export function topFeatures(rows: readonly InsightRow[], limit = 10) {
  const operators = fold(rows);
  const features = new Map<string, { feature: string; module: string; operators: number; events: number }>();
  const categories = new Map<Feature, number>();
  for (const f of operators.values()) {
    for (const [code, v] of usedFeatures(f)) {
      const cur = features.get(code) ?? { feature: v.name, module: v.module, operators: 0, events: 0 };
      cur.operators += 1;
      cur.events += v.events;
      features.set(code, cur);
    }
    for (const c of f.categories) categories.set(c, (categories.get(c) ?? 0) + 1);
  }
  const base = operators.size;
  return {
    operators_with_activity: base,
    wao_operators: [...operators.values()].filter(isWao).length,
    top_features: [...features.values()]
      .sort((a, b) => b.operators - a.operators || b.events - a.events)
      .slice(0, limit)
      .map((f) => ({ ...f, share_of_active_operators_pct: base ? Math.round((f.operators / base) * 1000) / 10 : 0 })),
    categories: FEATURES.map((c) => ({ category: label(c), operators: categories.get(c) ?? 0 })).sort((a, b) => b.operators - a.operators),
  };
}

export interface OperatorChange {
  readonly operator: string;
  readonly operator_id: string | null;
  readonly wao_before: number;
  readonly wao_now: number;
  readonly categories_added: string[];
  readonly categories_lost: string[];
  readonly features_started: string[];
  readonly features_stopped: string[];
  readonly biggest_event_changes: { feature: string; before: number; now: number }[];
}

function diffOperator(now: Folded | undefined, before: Folded | undefined): OperatorChange {
  const nowCats = now?.categories ?? new Set<Feature>();
  const beforeCats = before?.categories ?? new Set<Feature>();
  const nowF = usedFeatures(now);
  const beforeF = usedFeatures(before);
  const changes = [...new Set([...nowF.keys(), ...beforeF.keys()])]
    .map((code) => ({ feature: (nowF.get(code) ?? beforeF.get(code))!.name, before: beforeF.get(code)?.events ?? 0, now: nowF.get(code)?.events ?? 0 }))
    .filter((c) => c.before > 0 && c.now > 0)
    .sort((a, b) => Math.abs(b.now - b.before) - Math.abs(a.now - a.before))
    .slice(0, 5);
  return {
    operator: (now ?? before)?.operator ?? 'unknown',
    operator_id: (now ?? before)?.accountId ?? null,
    wao_before: beforeCats.size,
    wao_now: nowCats.size,
    categories_added: [...nowCats].filter((c) => !beforeCats.has(c)).map(label),
    categories_lost: [...beforeCats].filter((c) => !nowCats.has(c)).map(label),
    features_started: [...nowF].filter(([code]) => !beforeF.has(code)).map(([, v]) => v.name),
    features_stopped: [...beforeF].filter(([code]) => !nowF.has(code)).map(([, v]) => v.name),
    biggest_event_changes: changes,
  };
}

/**
 * Week against the week before, for everyone: who crossed into or fell out of WAO and what they started or stopped
 * (so "WAO improved" can be explained), the biggest risers and fallers, and which features and categories gained or
 * lost users.
 */
export function portfolioChanges(now: readonly InsightRow[], before: readonly InsightRow[]) {
  const nowMap = fold(now);
  const beforeMap = fold(before);
  const keys = new Set([...nowMap.keys(), ...beforeMap.keys()]);
  const diffs = [...keys].map((k) => ({ key: k, wasWao: isWao(beforeMap.get(k)), isWao: isWao(nowMap.get(k)), d: diffOperator(nowMap.get(k), beforeMap.get(k)) }));
  const joined = diffs.filter((x) => !x.wasWao && x.isWao).sort((a, b) => b.d.wao_now - a.d.wao_now);
  const left = diffs.filter((x) => x.wasWao && !x.isWao);
  const delta = (x: { d: OperatorChange }) => x.d.wao_now - x.d.wao_before;
  const stillActive = diffs.filter((x) => x.isWao === x.wasWao);
  const featureStat = (m: Map<string, Folded>) => {
    const out = new Map<string, { feature: string; operators: number }>();
    for (const f of m.values()) for (const [code, v] of usedFeatures(f)) out.set(code, { feature: v.name, operators: (out.get(code)?.operators ?? 0) + 1 });
    return out;
  };
  const fNow = featureStat(nowMap);
  const fBefore = featureStat(beforeMap);
  const feature_movement = [...new Set([...fNow.keys(), ...fBefore.keys()])]
    .map((code) => ({ feature: (fNow.get(code) ?? fBefore.get(code))!.feature, operators_before: fBefore.get(code)?.operators ?? 0, operators_now: fNow.get(code)?.operators ?? 0 }))
    .map((f) => ({ ...f, change: f.operators_now - f.operators_before }))
    .filter((f) => f.change !== 0)
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
    .slice(0, 12);
  const catCount = (m: Map<string, Folded>, c: Feature) => [...m.values()].filter((f) => f.categories.has(c)).length;
  const category_movement = FEATURES.map((c) => ({ category: label(c), operators_before: catCount(beforeMap, c), operators_now: catCount(nowMap, c) })).map((c) => ({ ...c, change: c.operators_now - c.operators_before }));
  const woNow = [...nowMap.values()].filter(isWao).length;
  const woBefore = [...beforeMap.values()].filter(isWao).length;
  return {
    wao: { before: woBefore, now: woNow, change: woNow - woBefore, operators_with_activity_before: beforeMap.size, operators_with_activity_now: nowMap.size },
    crossed_into_wao: joined.slice(0, LIST_MAX).map((x) => x.d),
    crossed_into_wao_total: joined.length,
    fell_out_of_wao: left.slice(0, LIST_MAX).map((x) => x.d),
    fell_out_of_wao_total: left.length,
    biggest_risers_still_in_same_state: stillActive.filter((x) => delta(x) > 0).sort((a, b) => delta(b) - delta(a)).slice(0, 8).map((x) => x.d),
    biggest_fallers_still_in_same_state: stillActive.filter((x) => delta(x) < 0).sort((a, b) => delta(a) - delta(b)).slice(0, 8).map((x) => x.d),
    category_movement,
    feature_movement,
  };
}

/** One operator, week against the week before. */
export function operatorChanges(now: readonly InsightRow[], before: readonly InsightRow[], accountId: string) {
  const pick = (rows: readonly InsightRow[]) => fold(rows.filter((r) => r.accountId === accountId)).get(accountId);
  return diffOperator(pick(now), pick(before));
}
