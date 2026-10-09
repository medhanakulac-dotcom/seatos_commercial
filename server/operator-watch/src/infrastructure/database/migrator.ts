import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Logger } from '@nestjs/common';
import { Pool } from 'pg';

/** `backend/migrations`, both from src (ts-node/jest) and dist (node). */
export function migrationsDir(): string {
  const candidates = [join(__dirname, '../../../migrations'), join(process.cwd(), 'migrations')];
  const dir = candidates.find((d) => existsSync(d));
  if (!dir) throw new Error(`migrations directory not found (looked in ${candidates.join(', ')})`);
  return dir;
}

/**
 * Applies `NNN_name.sql` files in order, each in its own transaction, recording them in
 * schema_migrations. An advisory lock keeps concurrent instances from migrating twice.
 */
export async function migrate(pool: Pool, dir = migrationsDir(), logger = new Logger('Migrator')): Promise<string[]> {
  const client = await pool.connect();
  const applied: string[] = [];
  try {
    await client.query('select pg_advisory_lock(7483001)');
    await client.query('create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())');
    const done = new Set((await client.query<{ name: string }>('select name from schema_migrations')).rows.map((r) => r.name));
    for (const file of readdirSync(dir).filter((f) => /^\d+_.+\.sql$/.test(f)).sort()) {
      if (done.has(file)) continue;
      await client.query('begin');
      try {
        await client.query(readFileSync(join(dir, file), 'utf8'));
        await client.query('insert into schema_migrations (name) values ($1)', [file]);
        await client.query('commit');
      } catch (error) {
        await client.query('rollback');
        throw new Error(`Migration ${file} failed: ${error instanceof Error ? error.message : String(error)}`);
      }
      applied.push(file);
      logger.log(`Applied migration ${file}`);
    }
  } finally {
    await client.query('select pg_advisory_unlock(7483001)').catch(() => undefined);
    client.release();
  }
  return applied;
}
