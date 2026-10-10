import { Pool, QueryResultRow } from 'pg';
import { FEATURES, Feature } from '../../domain/workspace/services/weekly-data';
import { PricingRecord, WeeklyDataStore, WeeklyTicketRecord, WeeklyUpload, WeeklyUsageRecord } from '../../domain/workspace/types/repositories/workspace.ports';

/** node-postgres turns a `date` into local midnight, so read it back with local fields (not UTC) to keep the day. */
const day = (v: unknown): string =>
  v instanceof Date ? `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}` : String(v).slice(0, 10);

const toUsage = (r: QueryResultRow): WeeklyUsageRecord => ({
  week: day(r.week),
  operatorName: r.operator_name,
  nameKey: r.name_key,
  accountId: r.account_id,
  features: Object.fromEntries(FEATURES.map((f) => [f, r[f]])) as Record<Feature, boolean>,
  featureCount: r.feature_count,
  operatorId: r.operator_id ?? null,
  featureUsage: r.feature_usage ?? null,
});

const toTickets = (r: QueryResultRow): WeeklyTicketRecord => ({
  week: day(r.week),
  operatorName: r.operator_name,
  nameKey: r.name_key,
  accountId: r.account_id,
  gmvUsd: Number(r.gmv_usd),
  tickets: r.tickets,
});

const toPricing = (r: QueryResultRow): PricingRecord => ({
  operatorName: r.operator_name,
  nameKey: r.name_key,
  accountId: r.account_id,
  operatorId: r.operator_id,
  currency: r.currency,
  ticketsCompared: r.tickets_compared,
  segments: r.segments,
  pricePct: Number(r.price_pct),
  windowDays: r.window_days,
  detail: r.detail ?? [],
  computedAt: new Date(r.computed_at).toISOString(),
});

/** Weekly uploads in Postgres (migrations/007_weekly_data.sql). */
export class PgWeeklyDataStore implements WeeklyDataStore {
  constructor(private readonly pool: Pool) {}

  replaceUsage(week: string, rows: readonly WeeklyUsageRecord[], by: string): Promise<void> {
    return this.replace('weekly_usage', week, rows, by, ['operator_name', 'name_key', 'account_id', ...FEATURES, 'feature_count', 'operator_id', 'feature_usage'], (r) => [
      r.operatorName,
      r.nameKey,
      r.accountId,
      ...FEATURES.map((f) => r.features[f]),
      r.featureCount,
      r.operatorId ?? null,
      r.featureUsage ? JSON.stringify(r.featureUsage) : null,
    ]);
  }

  replaceTickets(week: string, rows: readonly WeeklyTicketRecord[], by: string): Promise<void> {
    return this.replace('weekly_tickets', week, rows, by, ['operator_name', 'name_key', 'account_id', 'gmv_usd', 'tickets'], (r) => [r.operatorName, r.nameKey, r.accountId, r.gmvUsd, r.tickets]);
  }

  async usageFor(accountId: string, limit: number): Promise<WeeklyUsageRecord[]> {
    return (await this.pool.query('select * from weekly_usage where account_id = $1 order by week desc limit $2', [accountId, limit])).rows.map(toUsage);
  }

  async ticketsFor(accountId: string, limit: number): Promise<WeeklyTicketRecord[]> {
    return (await this.pool.query('select * from weekly_tickets where account_id = $1 order by week desc limit $2', [accountId, limit])).rows.map(toTickets);
  }

  async usageWeeks(limit: number): Promise<string[]> {
    return (await this.pool.query('select distinct week from weekly_usage order by week desc limit $1', [limit])).rows.map((r) => day(r.week));
  }

  async usageWeek(week?: string): Promise<WeeklyUsageRecord[]> {
    return (await this.weekRows('weekly_usage', week, 'feature_count desc, operator_name')).map(toUsage);
  }

  async ticketsWeek(week?: string): Promise<WeeklyTicketRecord[]> {
    return (await this.weekRows('weekly_tickets', week, 'tickets desc, operator_name')).map(toTickets);
  }

  async uploads(limit: number): Promise<WeeklyUpload[]> {
    const { rows } = await this.pool.query(
      `select kind, week, count(*)::int as rows, count(account_id)::int as matched, max(uploaded_at) as uploaded_at, max(uploaded_by) as uploaded_by
       from (select 'usage' as kind, week, account_id, uploaded_at, uploaded_by from weekly_usage
             union all select 'tickets', week, account_id, uploaded_at, uploaded_by from weekly_tickets) t
       group by kind, week order by week desc, kind limit $1`,
      [limit],
    );
    return rows.map((r) => ({ kind: r.kind, week: day(r.week), rows: r.rows, matched: r.matched, uploadedAt: new Date(r.uploaded_at).toISOString(), uploadedBy: r.uploaded_by }));
  }

  async nameLinks(): Promise<Map<string, string | null>> {
    const { rows } = await this.pool.query('select name_key, account_id from operator_name_links');
    return new Map(rows.map((r) => [r.name_key, r.account_id]));
  }

  async setNameLink(nameKey: string, accountId: string | null, by: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      await client.query(
        `insert into operator_name_links (name_key, account_id, set_by) values ($1, $2, $3)
         on conflict (name_key) do update set account_id = excluded.account_id, set_by = excluded.set_by, set_at = now()`,
        [nameKey, accountId, by],
      );
      await client.query('update weekly_usage set account_id = $2 where name_key = $1', [nameKey, accountId]);
      await client.query('update weekly_tickets set account_id = $2 where name_key = $1', [nameKey, accountId]);
      await client.query('update operator_pricing set account_id = $2 where name_key = $1', [nameKey, accountId]);
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async replacePricing(rows: readonly PricingRecord[], by: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      await client.query('delete from operator_pricing');
      for (const r of rows) {
        await client.query(
          `insert into operator_pricing (operator_name, name_key, account_id, operator_id, currency, tickets_compared, segments, price_pct, window_days, detail, uploaded_by)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           on conflict (operator_id, currency) do update set operator_name = excluded.operator_name, name_key = excluded.name_key, account_id = excluded.account_id,
             tickets_compared = excluded.tickets_compared, segments = excluded.segments, price_pct = excluded.price_pct, window_days = excluded.window_days,
             detail = excluded.detail, computed_at = now(), uploaded_by = excluded.uploaded_by`,
          [r.operatorName, r.nameKey, r.accountId, r.operatorId, r.currency, r.ticketsCompared, r.segments, r.pricePct, r.windowDays, JSON.stringify(r.detail), by],
        );
      }
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async pricingFor(accountId: string): Promise<PricingRecord[]> {
    return (await this.pool.query('select * from operator_pricing where account_id = $1 order by tickets_compared desc', [accountId])).rows.map(toPricing);
  }

  async pricingSyncedAt(): Promise<string | null> {
    const at = (await this.pool.query('select max(computed_at) as at from operator_pricing')).rows[0]?.at;
    return at ? new Date(at).toISOString() : null;
  }

  private async weekRows(table: string, week: string | undefined, order: string): Promise<QueryResultRow[]> {
    const target = week ?? (await this.pool.query(`select max(week) as w from ${table}`)).rows[0]?.w;
    if (!target) return [];
    return (await this.pool.query(`select * from ${table} where week = $1 order by ${order}`, [target])).rows;
  }

  private async replace<T>(table: string, week: string, rows: readonly T[], by: string, columns: string[], values: (r: T) => unknown[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      await client.query(`delete from ${table} where week = $1`, [week]);
      const cols = ['week', ...columns, 'uploaded_by'];
      for (const r of rows) {
        const vals = [week, ...values(r), by];
        await client.query(
          `insert into ${table} (${cols.join(', ')}) values (${vals.map((_, i) => `$${i + 1}`).join(', ')})
           on conflict (week, operator_name) do update set ${cols.slice(1).map((c) => `${c} = excluded.${c}`).join(', ')}`,
          vals,
        );
      }
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }
}
