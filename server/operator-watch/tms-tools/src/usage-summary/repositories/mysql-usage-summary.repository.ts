import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import mysql, { Pool } from 'mysql2/promise';
import { UsageSummaryRepository, UsageSummaryRow } from '../ports/usage-summary.repository';
import { parsePositiveFiniteInteger } from '../../config-validation';

@Injectable()
export class MySqlUsageSummaryRepository implements UsageSummaryRepository {
  private readonly pool: Pool;
  constructor(private readonly config: ConfigService) {
    const nodeEnv = this.config.get<string>('NODE_ENV', process.env.NODE_ENV ?? 'production');
    const isLocal = nodeEnv === 'test' || nodeEnv === 'development';
    const sslEnabled = this.config.get<string>('TMS_DB_SSL', 'true') === 'true';
    if (!isLocal && !sslEnabled) throw new Error('TMS_DB_SSL must be true outside test/development');
    this.pool = mysql.createPool({
      host: this.config.getOrThrow<string>('TMS_DB_HOST'),
      port: parsePositiveFiniteInteger(this.config.get<string>('TMS_DB_PORT', '3306'), 'TMS_DB_PORT'),
      user: this.config.getOrThrow<string>('TMS_DB_USER'),
      password: this.config.getOrThrow<string>('TMS_DB_PASSWORD'),
      database: this.config.getOrThrow<string>('TMS_DB_NAME'),
      ssl: sslEnabled ? { rejectUnauthorized: true } : undefined,
      connectionLimit: parsePositiveFiniteInteger(this.config.get<string>('TMS_DB_POOL_SIZE', '5'), 'TMS_DB_POOL_SIZE'),
    });
  }

  async findSummary(from: Date, to: Date, limit: number): Promise<readonly UsageSummaryRow[]> {
    const bounded = Math.min(Math.max(Math.trunc(limit), 1), 1000);
    const [rows] = await this.pool.execute<mysql.RowDataPacket[]>(
      `SELECT feature AS metric, COUNT(*) AS count
       FROM ai_usage_log
       WHERE operator_id = ? AND created_at >= ? AND created_at < ?
       GROUP BY feature ORDER BY count DESC LIMIT ?`,
      [parsePositiveFiniteInteger(this.config.get<string>('TMS_DB_OPERATOR_ID'), 'TMS_DB_OPERATOR_ID'), from, to, bounded],
    );
    return rows.map((row) => ({ metric: String(row.metric), count: Number(row.count) }));
  }
}
