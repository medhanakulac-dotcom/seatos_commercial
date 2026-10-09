import { Logger } from '@nestjs/common';
import { Pool } from 'pg';

/** Who a bearer token belongs to. `siteAdmin`: an admin of the main SeatOS site (allowed_users.role = 'admin'). */
export interface VerifiedIdentity {
  sub: string;
  email: string;
  siteAdmin: boolean;
}

/** Turns the browser's bearer token into a verified identity, or undefined when it is not valid. */
export interface IdentityVerifier {
  verify(token: string): Promise<VerifiedIdentity | undefined>;
}

export const IDENTITY_VERIFIER = Symbol('IDENTITY_VERIFIER');

/** Identities come from the main site's Supabase login; their subject is prefixed so they never collide. */
export const SUPABASE_SUBJECT_PREFIX = 'supabase:';

const CACHE_MS = 60_000;
const CACHE_MAX = 500;

type Fetch = typeof fetch;

/**
 * Verifies a Supabase access token by asking Supabase Auth who it belongs to (`GET /auth/v1/user`), then requires the
 * email to be on the main site's `allowed_users` list — the same list the login screen checks, enforced here because
 * the browser-side check can be skipped. Answers are cached briefly per token so a page load costs one round trip.
 */
export class SupabaseIdentityVerifier implements IdentityVerifier {
  private readonly logger = new Logger(SupabaseIdentityVerifier.name);
  private readonly cache = new Map<string, { identity: VerifiedIdentity | undefined; expires: number }>();

  constructor(
    private readonly pool: Pool | null,
    private readonly url: string,
    private readonly anonKey: string,
    private readonly fetchFn: Fetch = fetch,
  ) {}

  async verify(token: string): Promise<VerifiedIdentity | undefined> {
    const hit = this.cache.get(token);
    if (hit && hit.expires > Date.now()) return hit.identity;
    const identity = await this.lookup(token);
    if (this.cache.size >= CACHE_MAX) this.cache.delete(this.cache.keys().next().value as string);
    this.cache.set(token, { identity, expires: Date.now() + CACHE_MS });
    return identity;
  }

  private async lookup(token: string): Promise<VerifiedIdentity | undefined> {
    const res = await this.fetchFn(`${this.url.replace(/\/$/, '')}/auth/v1/user`, {
      headers: { apikey: this.anonKey, authorization: `Bearer ${token}` },
    });
    if (res.status === 401 || res.status === 403) return undefined;
    if (!res.ok) throw new Error(`Supabase Auth answered ${res.status}`);
    const user = (await res.json()) as { id?: unknown; email?: unknown };
    if (typeof user.id !== 'string' || typeof user.email !== 'string' || !user.email) return undefined;
    const email = user.email.toLowerCase();
    let siteAdmin = false;
    if (this.pool) {
      const { rows } = await this.pool.query<{ role: string | null }>('select role from public.allowed_users where lower(email) = $1 limit 1', [email]);
      if (rows.length === 0) {
        this.logger.warn(`Signed-in user ${email} is not in allowed_users`);
        return undefined;
      }
      siteAdmin = rows[0].role === 'admin';
    }
    return { sub: `${SUPABASE_SUBJECT_PREFIX}${user.id}`, email, siteAdmin };
  }
}

/** Fixed token → identity table: tests, and local runs without Supabase settings (non-production only). */
export class StaticIdentityVerifier implements IdentityVerifier {
  private readonly identities = new Map<string, VerifiedIdentity>();

  add(token: string, identity: { sub: string; email: string; siteAdmin?: boolean }): string {
    this.identities.set(token, { siteAdmin: false, ...identity });
    return `Bearer ${token}`;
  }

  async verify(token: string): Promise<VerifiedIdentity | undefined> {
    return this.identities.get(token);
  }
}

/**
 * Supabase when its URL and anon key are set — SUPABASE_URL/SUPABASE_ANON_KEY, or the site's own VITE_SUPABASE_URL/
 * VITE_SUPABASE_ANON_KEY (same project, already set on Vercel). Production refuses to start without them.
 */
export function createIdentityVerifier(pool: Pool | null, env: NodeJS.ProcessEnv = process.env): IdentityVerifier {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const key = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
  if (url && key) return new SupabaseIdentityVerifier(pool, url, key);
  if (env.NODE_ENV === 'production') throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required in production');
  new Logger('IdentityVerifier').warn('SUPABASE_URL not set: only test tokens are accepted');
  return new StaticIdentityVerifier();
}
