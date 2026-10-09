import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../app.module';
import { AUTH_REPOSITORY, InMemoryAuthRepository } from './auth.repository';
import { IDENTITY_VERIFIER, StaticIdentityVerifier } from './identity.verifier';

type Method = 'GET' | 'PUT' | 'POST';

/** Per-user roles end to end: sign-in bootstrap, role management, last-admin protection, operator scope. */
describe('Access management HTTP integration', () => {
  let app: NestFastifyApplication;
  let repo: InMemoryAuthRepository;
  let verifier: StaticIdentityVerifier;
  const saved = { ...process.env };

  const inject = (method: Method, url: string, authorization?: string, payload?: unknown, headers: Record<string, string> = {}) =>
    app.getHttpAdapter().getInstance().inject({
      method,
      url,
      headers: { ...(authorization ? { authorization } : {}), ...(payload !== undefined ? { 'content-type': 'application/json' } : {}), ...headers },
      payload: payload === undefined ? undefined : JSON.stringify(payload),
    });

  /** A Supabase sign-in (verifier stubbed): the first request with the token records the user. Returns the raw response. */
  const callback = async (sub: string, email: string, siteAdmin = false) => {
    const authorization = verifier.add(`token-${sub}`, { sub, email, siteAdmin });
    return { authorization, res: await inject('GET', '/auth/me', authorization) };
  };
  const signIn = async (sub: string, email: string, siteAdmin = false) => {
    const { authorization, res } = await callback(sub, email, siteAdmin);
    expect(res.statusCode).toBe(200);
    return authorization;
  };

  beforeAll(async () => {
    delete process.env.DATABASE_URL;
    process.env.WORKSPACE_WORKERS = 'false';
    process.env.AUTH_ADMIN_EMAILS = 'Boss@seatos.com, second.boss@seatos.com';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    repo = app.get<InMemoryAuthRepository>(AUTH_REPOSITORY);
    verifier = app.get<StaticIdentityVerifier>(IDENTITY_VERIFIER);
  });

  afterAll(async () => {
    await app.close();
    process.env = saved;
  });

  let boss: string;
  let newcomer: string;
  let newcomerId: string;

  it('makes a listed email an administrator on first sign-in and everyone else a viewer', async () => {
    boss = await signIn('sub-boss', 'boss@seatos.com');
    newcomer = await signIn('sub-new', 'new.person@seatos.com');

    const bossMe = (await inject('GET', '/auth/me', boss)).json();
    expect(bossMe).toMatchObject({ email: 'boss@seatos.com', role: 'admin', allOperators: true });
    expect(bossMe.permissions).toEqual(expect.arrayContaining(['admin:manage_users', 'admin:settings', 'workspace:review']));

    const me = (await inject('GET', '/auth/me', newcomer)).json();
    expect(me).toMatchObject({ role: 'viewer', allOperators: false });
    expect(me.permissions).toEqual(['dashboard:read', 'workspace:read']);
    newcomerId = me.id;
  });

  it('keeps the stored role on later sign-ins', async () => {
    await repo.setRole(newcomerId, 'analyst');
    await signIn('sub-new', 'new.person@seatos.com');
    expect((await inject('GET', '/auth/me', newcomer)).json().role).toBe('analyst');
    await repo.setRole(newcomerId, 'viewer');
  });

  it('lets only administrators manage users', async () => {
    expect((await inject('GET', '/admin/users')).statusCode).toBe(401);
    expect((await inject('GET', '/admin/users', newcomer)).statusCode).toBe(403);
    expect((await inject('PUT', `/admin/users/${newcomerId}/role`, newcomer, { role: 'admin' })).statusCode).toBe(403);
    expect((await inject('GET', '/admin/rbac', newcomer)).statusCode).toBe(403);
    expect((await repo.getUser(newcomerId))?.role).toBe('viewer');

    const list = (await inject('GET', '/admin/users', boss)).json();
    expect(list.roles).toEqual(['admin', 'analyst', 'viewer']);
    expect(list.users.map((u: { email: string }) => u.email)).toEqual(['boss@seatos.com', 'new.person@seatos.com']);
    expect(list.users[1]).toMatchObject({ name: 'New Person', role: 'viewer', active: true, operatorIds: [] });
  });

  it('changes a role, takes effect on the next request, and audits who did it', async () => {
    const res = await inject('PUT', `/admin/users/${newcomerId}/role`, boss, { role: 'analyst' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ id: newcomerId, role: 'analyst' });
    expect((await inject('GET', '/auth/me', newcomer)).json().permissions).toContain('workspace:review');
    const bossId = (await inject('GET', '/auth/me', boss)).json().id;
    expect(repo.auditEvents).toContainEqual(expect.objectContaining({ userId: bossId, action: 'admin.user_role_changed', detail: { targetUserId: newcomerId, from: 'viewer', to: 'analyst' } }));
  });

  it('validates input and requires JSON', async () => {
    expect((await inject('PUT', `/admin/users/${newcomerId}/role`, boss, { role: 'superuser' })).statusCode).toBe(400);
    expect((await inject('PUT', `/admin/users/${newcomerId}/role`, boss, {})).statusCode).toBe(400);
    expect((await inject('PUT', `/admin/users/${newcomerId}/active`, boss, { active: 'no' })).statusCode).toBe(400);
    expect((await inject('PUT', `/admin/users/${newcomerId}/operators`, boss, { operatorIds: ['ok', 'not ok!'] })).statusCode).toBe(400);
    expect((await inject('PUT', '/admin/users/missing-user/role', boss, { role: 'viewer' })).statusCode).toBe(404);
    expect((await inject('PUT', '/admin/users/bad%20id/role', boss, { role: 'viewer' })).statusCode).toBe(400);
    const form = await inject('PUT', `/admin/users/${newcomerId}/role`, boss, undefined, { 'content-type': 'application/x-www-form-urlencoded' });
    expect(form.statusCode).toBe(415);
  });

  it('never leaves the system without an active administrator', async () => {
    const bossId = (await inject('GET', '/auth/me', boss)).json().id;
    const demote = await inject('PUT', `/admin/users/${bossId}/role`, boss, { role: 'viewer' });
    expect(demote.statusCode).toBe(400);
    expect(demote.json().message).toMatch(/administrator/);
    expect((await inject('PUT', `/admin/users/${bossId}/active`, boss, { active: false })).statusCode).toBe(400);
    expect((await inject('GET', '/auth/me', boss)).json().role).toBe('admin');

    // With a second administrator the first may step down.
    const second = await signIn('sub-second', 'second.boss@seatos.com');
    expect((await inject('GET', '/auth/me', second)).json().role).toBe('admin');
    expect((await inject('PUT', `/admin/users/${bossId}/role`, boss, { role: 'analyst' })).statusCode).toBe(200);
    expect((await inject('PUT', `/admin/users/${bossId}/role`, boss, { role: 'admin' })).statusCode).toBe(403); // no longer an admin
    expect((await inject('PUT', `/admin/users/${bossId}/role`, second, { role: 'admin' })).statusCode).toBe(200);
  });

  it('exposes the active role policy', async () => {
    const policy = (await inject('GET', '/admin/rbac', boss)).json();
    expect(policy.permissions).toContainEqual({ permission: 'dashboard:read', scope: 'operator' });
    expect(policy.permissions).toContainEqual({ permission: 'workspace:review', scope: 'team' });
    const viewer = policy.roles.find((r: { role: string }) => r.role === 'viewer');
    expect(viewer).toEqual({ role: 'viewer', permissions: ['dashboard:read', 'workspace:read'], allOperators: false });
    expect(policy.roles.find((r: { role: string }) => r.role === 'admin').allOperators).toBe(true);
  });

  it('scopes operator permissions to memberships set by an administrator', async () => {
    expect((await inject('GET', '/reporting/accounts/operator-1', newcomer)).statusCode).toBe(403);
    const set = await inject('PUT', `/admin/users/${newcomerId}/operators`, boss, { operatorIds: ['operator-1', 'operator-1'] });
    expect(set.statusCode).toBe(200);
    expect(set.json().operatorIds).toEqual(['operator-1']);
    expect((await inject('GET', '/reporting/accounts/operator-1', newcomer)).statusCode).toBe(200);
    expect((await inject('GET', '/reporting/accounts/operator-2', newcomer)).statusCode).toBe(403);
    await inject('PUT', `/admin/users/${newcomerId}/operators`, boss, { operatorIds: [] });
    expect((await inject('GET', '/reporting/accounts/operator-1', newcomer)).statusCode).toBe(403);
  });

  it('lets a Supabase sign-in take over a dev placeholder, and refuses a second account on that email', async () => {
    const dev = await repo.upsertUser({ subject: 'dev:chris@seatos.com', email: 'chris@seatos.com', role: 'admin' });
    const chris = await signIn('sub-chris', 'chris@seatos.com');
    expect((await inject('GET', '/auth/me', chris)).json()).toMatchObject({ id: dev.id, email: 'chris@seatos.com', role: 'admin' });
    const clash = (await callback('sub-impostor', 'chris@seatos.com')).res;
    expect(clash.statusCode).toBe(403);
    expect(clash.json().message).toMatch(/different account/);
  });

  it('makes an admin of the main site an administrator on first sign-in', async () => {
    const lead = await signIn('sub-lead', 'lead@seatos.com', true);
    expect((await inject('GET', '/auth/me', lead)).json()).toMatchObject({ role: 'admin', allOperators: true });
  });

  it('rejects a missing or unknown token', async () => {
    expect((await inject('GET', '/auth/me', 'Bearer nobody')).statusCode).toBe(401);
    expect((await inject('GET', '/auth/me', 'Basic abc')).statusCode).toBe(401);
  });

  it('cuts off a deactivated user immediately and blocks new sign-ins', async () => {
    expect((await inject('PUT', `/admin/users/${newcomerId}/active`, boss, { active: false })).json().active).toBe(false);
    expect((await inject('GET', '/auth/me', newcomer)).statusCode).toBe(401);
    expect((await callback('sub-new', 'new.person@seatos.com')).res.statusCode).toBe(401);
    expect((await inject('PUT', `/admin/users/${newcomerId}/active`, boss, { active: true })).json().active).toBe(true);
    expect((await inject('GET', '/auth/me', newcomer)).statusCode).toBe(200);
  });
});
