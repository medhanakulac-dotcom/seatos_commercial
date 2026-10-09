import { Inject, Logger, Module, OnApplicationShutdown, Optional } from '@nestjs/common';
import { Pool } from 'pg';
import { migrate } from './migrator';

export const PG_POOL = Symbol('PG_POOL');

/** Closes the Postgres pool on shutdown. */
class PoolCloser implements OnApplicationShutdown {
  constructor(@Optional() @Inject(PG_POOL) private readonly pool: Pool | null) {}
  async onApplicationShutdown(): Promise<void> {
    await this.pool?.end();
  }
}

const logger = new Logger('DatabaseModule');

/**
 * The single Postgres pool, shared by the workspace and auth modules.
 * `DATABASE_URL` → Postgres (migrations applied on startup); without it (non-production only) the pool is null and
 * the modules fall back to their in-memory adapters.
 */
@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: async (): Promise<Pool | null> => {
        const url = process.env.DATABASE_URL;
        if (!url) {
          if (process.env.NODE_ENV === 'production') throw new Error('DATABASE_URL is required in production');
          logger.warn('DATABASE_URL not set: using in-memory stores (data, users and roles are lost on restart)');
          return null;
        }
        // Serverless (Vercel) runs many small instances against Supabase's pooler, so each keeps only a couple of clients.
        const max = Number(process.env.DATABASE_POOL_SIZE ?? (process.env.VERCEL ? 2 : 10));
        // DATABASE_SSL_CA (PEM, e.g. Supabase's CA certificate) turns on verified TLS; leave sslmode out of the URL then.
        const ca = process.env.DATABASE_SSL_CA?.replace(/\\n/g, '\n');
        const pool = new Pool({ connectionString: url, max, ...(ca ? { ssl: { ca, rejectUnauthorized: true } } : {}) });
        // An idle client can be dropped by Postgres (restart, failover, admin kill). Without a listener that
        // 'error' event crashes the process; with one, the pool discards the client and reconnects on next use.
        pool.on('error', (error) => logger.warn(`Postgres dropped an idle connection: ${error.message}`));
        // Off by default on Vercel: Supabase's transaction pooler cannot hold the migrator's session lock, so the schema
        // is applied with supabase/setup.sql instead. DATABASE_MIGRATE=true forces it (use a session-mode URL then).
        const migrateOnBoot = process.env.DATABASE_MIGRATE ? process.env.DATABASE_MIGRATE !== 'false' : !process.env.VERCEL;
        if (migrateOnBoot) await migrate(pool);
        return pool;
      },
    },
    PoolCloser,
  ],
  exports: [PG_POOL],
})
export class DatabaseModule {}
