import { Pool } from 'pg';
import { EmailConflictError, LastAdminError } from '../../auth/auth.repository';
import { migrate } from '../database/migrator';
import { PgAuthRepository } from './pg-auth.repository';

/**
 * Runs against a real Postgres when TEST_DATABASE_URL is set (e.g. the compose `db` service:
 * postgres://commercial:commercial-local@localhost:5433/commercial_test). Only the auth tables are emptied.
 */
const url = process.env.TEST_DATABASE_URL;
const describeDb = url ? describe : describe.skip;

describeDb('PgAuthRepository', () => {
  let pool: Pool;
  let repo: PgAuthRepository;

  beforeAll(async () => {
    pool = new Pool({ connectionString: url });
    await migrate(pool);
    repo = new PgAuthRepository(pool);
  });

  beforeEach(async () => {
    await pool.query('truncate auth_users, auth_operator_memberships, auth_audit_events cascade');
  });

  afterAll(async () => {
    await pool?.end();
  });

  it('creates a user with the given role once, then only records the sign-in', async () => {
    const first = await repo.upsertUser({ subject: 'g-1', email: 'Person@SeatOS.com', role: 'analyst' });
    expect(first).toMatchObject({ subject: 'g-1', email: 'person@seatos.com', role: 'analyst', active: true });
    expect(first.lastLoginAt).not.toBeNull();

    const again = await repo.upsertUser({ subject: 'g-1', email: 'renamed@seatos.com', role: 'admin' });
    expect(again).toMatchObject({ id: first.id, email: 'renamed@seatos.com', role: 'analyst' });
    expect(await repo.getUser(first.id)).toEqual(again);
    expect(await repo.getUser('missing')).toBeUndefined();
  });

  it('keeps the Google subject immutable and emails unique', async () => {
    const user = await repo.upsertUser({ subject: 'g-1', email: 'a@seatos.com' });
    await expect(repo.upsertUser({ subject: 'other', email: 'x@seatos.com', id: user.id })).rejects.toThrow('immutable');
    await expect(repo.upsertUser({ subject: 'g-2', email: 'A@seatos.com' })).rejects.toThrow('already belongs');
  });

  it('lets the first real Google account claim a dev placeholder, keeping id and role', async () => {
    const dev = await repo.upsertUser({ subject: 'dev:chris@seatos.com', email: 'chris@seatos.com', role: 'admin' });
    const real = await repo.upsertUser({ subject: 'google-1', email: 'Chris@seatos.com', role: 'viewer' });
    expect(real).toMatchObject({ id: dev.id, subject: 'google-1', role: 'admin' });
    expect(await repo.upsertUser({ subject: 'google-1', email: 'chris@seatos.com' })).toMatchObject({ id: dev.id });
    expect(await repo.listUsers()).toHaveLength(1);
  });

  it('reports a different real account on the same email as a conflict, not a crash', async () => {
    await repo.upsertUser({ subject: 'google-1', email: 'chris@seatos.com' });
    await expect(repo.upsertUser({ subject: 'google-2', email: 'chris@seatos.com' })).rejects.toBeInstanceOf(EmailConflictError);
    await expect(repo.upsertUser({ subject: 'dev:chris@seatos.com', email: 'chris@seatos.com' })).rejects.toBeInstanceOf(EmailConflictError);
  });

  it('lists users by email and rejects roles outside the policy at the database', async () => {
    await repo.upsertUser({ subject: 'g-2', email: 'b@seatos.com' });
    await repo.upsertUser({ subject: 'g-1', email: 'a@seatos.com' });
    expect((await repo.listUsers()).map((u) => u.email)).toEqual(['a@seatos.com', 'b@seatos.com']);
    await expect(pool.query("update auth_users set role = 'root'")).rejects.toThrow();
  });

  it('changes roles and activation, and protects the last active administrator', async () => {
    const admin = await repo.upsertUser({ subject: 'g-1', email: 'a@seatos.com', role: 'admin' });
    const viewer = await repo.upsertUser({ subject: 'g-2', email: 'b@seatos.com' });
    expect(await repo.countActiveAdmins()).toBe(1);

    await expect(repo.setRole(admin.id, 'viewer')).rejects.toBeInstanceOf(LastAdminError);
    await expect(repo.setActive(admin.id, false)).rejects.toBeInstanceOf(LastAdminError);
    expect(await repo.setRole('missing', 'admin')).toBeUndefined();

    expect(await repo.setRole(viewer.id, 'admin')).toMatchObject({ role: 'admin' });
    expect(await repo.setActive(admin.id, false)).toMatchObject({ active: false });
    expect(await repo.countActiveAdmins()).toBe(1);
    await expect(repo.setRole(viewer.id, 'analyst')).rejects.toBeInstanceOf(LastAdminError);
    expect((await repo.getUser(viewer.id))?.role).toBe('admin');
  });

  it('cannot demote both administrators at once', async () => {
    const a = await repo.upsertUser({ subject: 'g-1', email: 'a@seatos.com', role: 'admin' });
    const b = await repo.upsertUser({ subject: 'g-2', email: 'b@seatos.com', role: 'admin' });
    const results = await Promise.allSettled([repo.setRole(a.id, 'viewer'), repo.setRole(b.id, 'viewer')]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await repo.countActiveAdmins()).toBe(1);
  });

  it('stores operator memberships and replaces them as a set', async () => {
    const user = await repo.upsertUser({ subject: 'g-1', email: 'a@seatos.com' });
    await repo.addMembership(user.id, 'op-1');
    await repo.addMembership(user.id, 'op-1');
    expect(await repo.hasMembership(user.id, 'op-1')).toBe(true);
    expect(await repo.hasMembership(user.id, 'op-2')).toBe(false);

    await repo.setMemberships(user.id, ['op-3', 'op-2', 'op-3']);
    expect(await repo.listMemberships(user.id)).toEqual(['op-2', 'op-3']);
    await repo.setMemberships(user.id, []);
    expect(await repo.listMemberships(user.id)).toEqual([]);
  });

  it('records audit events with detail and outlives the user', async () => {
    const user = await repo.upsertUser({ subject: 'g-1', email: 'a@seatos.com' });
    await repo.audit(user.id, 'admin.user_role_changed', undefined, { from: 'viewer', to: 'analyst' });
    await repo.audit(user.id, 'auth.authorization_denied', 'op-9');
    await pool.query('delete from auth_users where id = $1', [user.id]);
    const { rows } = await pool.query('select action, operator_id, detail from auth_audit_events order by id');
    expect(rows).toEqual([
      { action: 'admin.user_role_changed', operator_id: null, detail: { from: 'viewer', to: 'analyst' } },
      { action: 'auth.authorization_denied', operator_id: 'op-9', detail: null },
    ]);
  });
});
