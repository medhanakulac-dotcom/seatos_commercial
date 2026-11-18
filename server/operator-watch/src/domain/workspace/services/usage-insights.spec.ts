import { InsightRow, operatorChanges, portfolioChanges, topFeatures } from './usage-insights';
import { FEATURES, Feature } from './weekly-data';

const row = (week: string, name: string, accountId: string, cats: Feature[], usage: Record<string, number> = {}): InsightRow => ({
  week,
  operatorName: name,
  accountId,
  nameKey: name.toLowerCase(),
  features: Object.fromEntries(FEATURES.map((f) => [f, cats.includes(f)])) as Record<Feature, boolean>,
  featureCount: cats.length,
  featureUsage: Object.entries(usage).map(([code, events]) => ({ code, name: code.toUpperCase(), module: 'M', events, days: 2 })),
});

const before = [
  row('w0', 'Alpha', 'a', ['reservation_management', 'trip_management'], { bl: 10 }),
  row('w0', 'Beta', 'b', ['reservation_management', 'trip_management', 'analytics'], { bl: 8, pn: 5 }),
];
const now = [
  row('w1', 'Alpha', 'a', ['reservation_management', 'trip_management', 'fleet_management'], { bl: 12, dm: 6 }),
  row('w1', 'Beta', 'b', ['reservation_management', 'trip_management'], { bl: 9 }),
  row('w1', 'Gamma', 'g', ['analytics'], { rh: 4 }),
];

describe('usage insights', () => {
  it('ranks features by operators using them', () => {
    const t = topFeatures(now);
    expect(t.top_features[0]).toMatchObject({ feature: 'BL', operators: 2 });
    expect(t.wao_operators).toBe(1);
  });

  it('explains who crossed the WAO line and why', () => {
    const c = portfolioChanges(now, before);
    expect(c.wao).toMatchObject({ before: 1, now: 1 });
    expect(c.crossed_into_wao[0]).toMatchObject({ operator: 'Alpha', categories_added: ['Fleet'], features_started: ['DM'] });
    expect(c.fell_out_of_wao[0]).toMatchObject({ operator: 'Beta', categories_lost: ['Analytics'], features_stopped: ['PN'] });
  });

  it('diffs one operator', () => {
    expect(operatorChanges(now, before, 'a')).toMatchObject({ wao_before: 2, wao_now: 3, categories_added: ['Fleet'] });
  });
});
