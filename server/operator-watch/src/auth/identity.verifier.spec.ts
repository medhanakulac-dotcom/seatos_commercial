import { Pool } from 'pg';
import { SupabaseIdentityVerifier } from './identity.verifier';

describe('SupabaseIdentityVerifier', () => {
  const user = { id: 'uid-1', email: 'Anong@SeatOS.com' };
  const fetchOk = (body: unknown, status = 200) =>
    jest.fn(async () => ({ ok: status >= 200 && status < 300, status, json: async () => body })) as unknown as typeof fetch & jest.Mock;
  const pool = (rows: { role: string | null }[]) => ({ query: jest.fn(async () => ({ rows })) }) as unknown as Pool & { query: jest.Mock };

  it('asks Supabase Auth for the token owner and requires an allowed_users row', async () => {
    const fetchFn = fetchOk(user);
    const db = pool([{ role: 'member' }]);
    const verifier = new SupabaseIdentityVerifier(db, 'https://x.supabase.co/', 'anon-key', fetchFn);
    expect(await verifier.verify('tok')).toEqual({ sub: 'supabase:uid-1', email: 'anong@seatos.com', siteAdmin: false });
    expect(fetchFn).toHaveBeenCalledWith('https://x.supabase.co/auth/v1/user', { headers: { apikey: 'anon-key', authorization: 'Bearer tok' } });
    expect(db.query.mock.calls[0][1]).toEqual(['anong@seatos.com']);
  });

  it('marks main-site admins and caches answers per token', async () => {
    const fetchFn = fetchOk(user);
    const verifier = new SupabaseIdentityVerifier(pool([{ role: 'admin' }]), 'https://x.supabase.co', 'k', fetchFn);
    expect((await verifier.verify('tok'))?.siteAdmin).toBe(true);
    await verifier.verify('tok');
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('rejects tokens Supabase refuses and emails not on the allowed list', async () => {
    expect(await new SupabaseIdentityVerifier(pool([{ role: 'admin' }]), 'https://x', 'k', fetchOk({}, 401)).verify('bad')).toBeUndefined();
    expect(await new SupabaseIdentityVerifier(pool([]), 'https://x', 'k', fetchOk(user)).verify('tok')).toBeUndefined();
  });

  it('fails loudly when Supabase is down instead of treating it as signed out', async () => {
    await expect(new SupabaseIdentityVerifier(null, 'https://x', 'k', fetchOk({}, 500)).verify('tok')).rejects.toThrow('Supabase Auth answered 500');
  });
});
