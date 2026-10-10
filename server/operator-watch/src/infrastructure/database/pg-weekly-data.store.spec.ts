import { Pool } from 'pg';
import { FEATURES } from '../../domain/workspace/services/weekly-data';
import { PricingRecord, WeeklyUsageRecord } from '../../domain/workspace/types/repositories/workspace.ports';
import { migrate } from './migrator';
import { PgWeeklyDataStore } from './pg-weekly-data.store';

/** Runs against a real Postgres when TEST_DATABASE_URL is set (see pg-workspace.store.spec.ts). */
const url = process.env.TEST_DATABASE_URL;
const describeDb = url ? describe : describe.skip;

const usage = (week: string, name: string, accountId: string | null, count: number): WeeklyUsageRecord => ({
  week,
  operatorName: name,
  nameKey: name.toLowerCase().replace(/\W/g, ''),
  accountId,
  features: Object.fromEntries(FEATURES.map((f, i) => [f, i < count])) as WeeklyUsageRecord['features'],
  featureCount: count,
});

describeDb('PgWeeklyDataStore', () => {
  let pool: Pool;
  let store: PgWeeklyDataStore;

  beforeAll(async () => {
    pool = new Pool({ connectionString: url });
    await migrate(pool);
    store = new PgWeeklyDataStore(pool);
    await pool.query('delete from weekly_usage; delete from weekly_tickets; delete from operator_name_links; delete from operator_pricing;');
  });

  afterAll(async () => {
    await pool?.end();
  });

  it('replaces a week, keeps other weeks, and reads per account newest first', async () => {
    await store.replaceUsage('2026-09-28', [usage('2026-09-28', 'Alpha', 'D-1', 2)], 'a@seatos.com');
    await store.replaceUsage('2026-10-05', [usage('2026-10-05', 'Alpha', 'D-1', 5), usage('2026-10-05', 'Bravo', null, 1)], 'a@seatos.com');
    await store.replaceUsage('2026-10-05', [usage('2026-10-05', 'Alpha', 'D-1', 6)], 'b@seatos.com'); // re-upload
    const alpha = await store.usageFor('D-1', 10);
    expect(alpha.map((r) => [r.week, r.featureCount])).toEqual([
      ['2026-10-05', 6],
      ['2026-09-28', 2],
    ]);
    expect(alpha[0].features).toMatchObject({ inventory_management: true, accounting: false });
    expect((await store.usageWeek()).map((r) => r.operatorName)).toEqual(['Alpha']); // Bravo replaced away
  });

  it('round-trips the operator id and per-feature activity of a BigQuery sync row', async () => {
    const row: WeeklyUsageRecord = { ...usage('2026-10-12', 'Delta', 'D-4', 3), operatorId: 28271, featureUsage: { bl: { events: 120, days: 5 }, rm: { events: 3, days: 1 } } };
    await store.replaceUsage('2026-10-12', [row, usage('2026-10-12', 'Echo', null, 1)], 'bigquery-sync');
    const [back] = await store.usageFor('D-4', 5);
    expect(back).toMatchObject({ operatorId: 28271, featureUsage: { bl: { events: 120, days: 5 }, rm: { events: 3, days: 1 } } });
    expect((await store.usageWeek('2026-10-12')).find((r) => r.operatorName === 'Echo')).toMatchObject({ operatorId: null, featureUsage: null }); // CSV-style row
  });

  it('stores tickets with GMV, lists uploads, and applies a hand-made link to stored rows', async () => {
    await store.replaceTickets(
      '2026-10-05',
      [
        { week: '2026-10-05', operatorName: 'Alpha', nameKey: 'alpha', accountId: 'D-1', gmvUsd: 1234.57, tickets: 321 },
        { week: '2026-10-05', operatorName: 'Charlie', nameKey: 'charlie', accountId: null, gmvUsd: 10, tickets: 2 },
      ],
      'a@seatos.com',
    );
    expect((await store.ticketsWeek('2026-10-05')).map((r) => [r.operatorName, r.tickets, r.gmvUsd])).toEqual([
      ['Alpha', 321, 1234.57],
      ['Charlie', 2, 10],
    ]);
    await store.setNameLink('charlie', 'D-3', 'a@seatos.com');
    expect((await store.ticketsFor('D-3', 5)).map((r) => r.tickets)).toEqual([2]);
    expect(await store.nameLinks()).toEqual(new Map([['charlie', 'D-3']]));
    const uploads = await store.uploads(10);
    expect(uploads).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'tickets', week: '2026-10-05', rows: 2, matched: 2 }),
        expect.objectContaining({ kind: 'usage', week: '2026-10-05', rows: 1, matched: 1, uploadedBy: 'b@seatos.com' }),
      ]),
    );
  });

  it('keeps the price comparison as one snapshot and follows a hand-made match', async () => {
    const rec = (operatorId: number, name: string, accountId: string | null): PricingRecord => ({
      operatorName: name,
      nameKey: name.toLowerCase().replace(/\W/g, ''),
      accountId,
      operatorId,
      currency: 'THB',
      ticketsCompared: 300,
      segments: 3,
      pricePct: -4.5,
      windowDays: 90,
      detail: [{ from: 'A', to: 'B', vehicleType: 'Bus', vehicleClass: 'VIP', tickets: 40, avgPrice: 500, peerAvgPrice: 520, peers: 2, pct: -3.8 }],
      computedAt: new Date().toISOString(),
    });
    await store.replacePricing([rec(1, 'Alpha', 'D-1'), rec(2, 'Bravo', null)], 'sync');
    expect(await store.pricingFor('D-1')).toEqual([expect.objectContaining({ operatorId: 1, currency: 'THB', pricePct: -4.5, detail: [expect.objectContaining({ pct: -3.8 })] })]);
    await store.setNameLink('bravo', 'D-2', 'a@seatos.com');
    expect(await store.pricingFor('D-2')).toHaveLength(1);
    await store.replacePricing([rec(1, 'Alpha', 'D-1')], 'sync');
    expect(await store.pricingFor('D-2')).toEqual([]);
  });

  it('lists rows without an account and gives them one later without making a link', async () => {
    await pool.query('delete from weekly_usage; delete from operator_name_links;');
    await store.replaceUsage('2026-10-12', [usage('2026-10-12', 'Nameless Ferry', null, 3), usage('2026-10-12', 'Known Ferry', 'D-9', 2)], 'sync');
    expect(await store.unmatchedNames()).toEqual([{ nameKey: 'namelessferry', operatorName: 'Nameless Ferry' }]);
    await store.assignAccount('namelessferry', 'D-7');
    await store.assignAccount('knownferry', 'D-8'); // never overrides an account a row already has
    expect(await store.unmatchedNames()).toEqual([]);
    expect((await store.usageFor('D-7', 5)).map((r) => r.operatorName)).toEqual(['Nameless Ferry']);
    expect((await store.usageFor('D-9', 5)).map((r) => r.operatorName)).toEqual(['Known Ferry']);
    expect(await store.nameLinks()).toEqual(new Map());
  });

  it('shows an account the rows of an operator name it is also reported under', async () => {
    await pool.query('delete from weekly_usage; delete from weekly_tickets; delete from account_aliases;');
    await store.replaceUsage('2026-10-12', [usage('2026-10-12', 'Own Name', 'D-1', 1), usage('2026-10-12', 'Other Operator', 'D-2', 5)], 'sync');
    expect((await store.usageFor('D-1', 10)).map((r) => r.operatorName)).toEqual(['Own Name']);
    await store.addAlias('D-1', 'Other Operator', 'test');
    await store.addAlias('D-1', 'Other Operator', 'test'); // twice: no error, one row
    expect((await store.usageFor('D-1', 10)).map((r) => r.operatorName).sort()).toEqual(['Other Operator', 'Own Name']);
    expect(await store.aliases()).toEqual([{ accountId: 'D-1', operatorName: 'Other Operator' }]);
    expect((await store.usageFor('D-2', 10)).map((r) => r.operatorName)).toEqual(['Other Operator']); // the other account keeps its own data
  });
});
