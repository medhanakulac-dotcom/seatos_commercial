import { EmailConflictError, InMemoryAuthRepository } from './auth.repository';
import { loadAuthConfig } from './auth.config';
import { PERMISSIONS, ROLES } from './permissions';
import { RbacService } from './rbac.service';
import { DEFAULT_ROLE_PERMISSIONS, RolePolicy, StaticRolePolicy } from './role.policy';
import { SignInService } from './sign-in.service';

describe('StaticRolePolicy', () => {
  it('defines every role and only known permissions', () => {
    expect(Object.keys(DEFAULT_ROLE_PERMISSIONS).sort()).toEqual([...ROLES].sort());
    for (const permissions of Object.values(DEFAULT_ROLE_PERMISSIONS)) for (const p of permissions) expect(PERMISSIONS).toContain(p);
  });

  it('grants each role a subset of the roles above it', async () => {
    const policy = new StaticRolePolicy();
    const [admin, analyst, viewer] = await Promise.all([policy.permissionsFor('admin'), policy.permissionsFor('analyst'), policy.permissionsFor('viewer')]);
    for (const p of viewer) expect(analyst.has(p)).toBe(true);
    for (const p of analyst) expect(admin.has(p)).toBe(true);
    expect(viewer.has('workspace:review')).toBe(false);
    expect(analyst.has('admin:manage_users')).toBe(false);
  });
});

describe('RbacService policy seam', () => {
  it('follows a replacement policy without any other change', async () => {
    const repo = new InMemoryAuthRepository();
    const viewer = await repo.upsertUser({ subject: 's', email: 'v@seatos.com', role: 'viewer' });
    const stricter: RolePolicy = {
      permissionsFor: async (role) => new Set(role === 'viewer' ? ['workspace:review' as const] : []),
      scopeOf: () => 'team',
      bypassesOperatorScope: () => false,
    };
    expect(await new RbacService(repo, new StaticRolePolicy()).can(viewer.id, 'workspace:review')).toBe(false);
    expect(await new RbacService(repo, stricter).can(viewer.id, 'workspace:review')).toBe(true);
    expect(await new RbacService(repo, stricter).can(viewer.id, 'workspace:read')).toBe(false);
  });

  it('denies inactive and unknown users and reports no permissions for them', async () => {
    const repo = new InMemoryAuthRepository();
    const rbac = new RbacService(repo, new StaticRolePolicy());
    const admin = await repo.upsertUser({ subject: 'a', email: 'a@seatos.com', role: 'admin' });
    const analyst = await repo.upsertUser({ subject: 'b', email: 'b@seatos.com', role: 'analyst' });
    expect(await rbac.permissionsOf(analyst.id)).toEqual(['dashboard:export', 'dashboard:read', 'workspace:read', 'workspace:review']);
    await repo.setActive(analyst.id, false);
    expect(await rbac.can(analyst.id, 'workspace:read')).toBe(false);
    expect(await rbac.permissionsOf(analyst.id)).toEqual([]);
    expect(await rbac.allOperators(analyst.id)).toBe(false);
    expect(await rbac.allOperators(admin.id)).toBe(true);
    expect(await rbac.permissionsOf('missing')).toEqual([]);
  });
});

describe('InMemoryAuthRepository administrators', () => {
  it('refuses to remove the last active administrator, however it is attempted', async () => {
    const repo = new InMemoryAuthRepository();
    const only = await repo.upsertUser({ subject: 'a', email: 'a@seatos.com', role: 'admin' });
    await expect(repo.setRole(only.id, 'viewer')).rejects.toThrow('administrator');
    await expect(repo.setActive(only.id, false)).rejects.toThrow('administrator');
    const other = await repo.upsertUser({ subject: 'b', email: 'b@seatos.com', role: 'admin' });
    await expect(repo.setRole(only.id, 'viewer')).resolves.toMatchObject({ role: 'viewer' });
    await expect(repo.setActive(other.id, false)).rejects.toThrow('administrator');
    expect(await repo.setRole('missing', 'viewer')).toBeUndefined();
  });
});

describe('InMemoryAuthRepository dev placeholders', () => {
  it('lets the first real Google account claim a dev placeholder, keeping id and role', async () => {
    const repo = new InMemoryAuthRepository();
    const dev = await repo.upsertUser({ subject: 'dev:chris@seatos.com', email: 'chris@seatos.com', role: 'admin' });
    const real = await repo.upsertUser({ subject: 'google-1', email: 'Chris@seatos.com', role: 'viewer' });
    expect(real).toMatchObject({ id: dev.id, subject: 'google-1', role: 'admin' });
    expect(await repo.upsertUser({ subject: 'google-1', email: 'chris@seatos.com' })).toMatchObject({ id: dev.id });
    expect((await repo.listUsers()).length).toBe(1);
  });

  it('refuses a second, different Google account on an email that a real account owns', async () => {
    const repo = new InMemoryAuthRepository();
    await repo.upsertUser({ subject: 'google-1', email: 'chris@seatos.com' });
    await expect(repo.upsertUser({ subject: 'google-2', email: 'chris@seatos.com' })).rejects.toBeInstanceOf(EmailConflictError);
    // a dev placeholder cannot take over a real account's email either
    await expect(repo.upsertUser({ subject: 'dev:chris@seatos.com', email: 'chris@seatos.com' })).rejects.toBeInstanceOf(EmailConflictError);
  });
});

describe('SignInService', () => {
  const identity = (n: string) => ({ sub: `sub-${n}`, email: `${n}@seatos.com` });
  const make = (env: NodeJS.ProcessEnv) => {
    const repo = new InMemoryAuthRepository();
    return { repo, signIn: new SignInService(repo, loadAuthConfig(env)) };
  };

  it('gives new users the default role and listed emails the admin role', async () => {
    const { signIn } = make({ AUTH_ADMIN_EMAILS: ' Root@seatos.com ,other@seatos.com', AUTH_DEFAULT_ROLE: 'analyst' });
    expect((await signIn.signIn(identity('root'))).role).toBe('admin');
    expect((await signIn.signIn(identity('someone'))).role).toBe('analyst');
  });

  it('does not re-promote a listed admin who was demoted while another administrator exists', async () => {
    const { repo, signIn } = make({ AUTH_ADMIN_EMAILS: 'root@seatos.com,two@seatos.com' });
    const root = await signIn.signIn(identity('root'));
    await signIn.signIn(identity('two'));
    await repo.setRole(root.id, 'viewer');
    expect((await signIn.signIn(identity('root'))).role).toBe('viewer');
  });

  it('recovers when no active administrator remains', async () => {
    const { repo, signIn } = make({ AUTH_ADMIN_EMAILS: 'root@seatos.com' });
    const stranded = await repo.upsertUser({ subject: 'sub-root', email: 'root@seatos.com', role: 'viewer' });
    expect(await repo.countActiveAdmins()).toBe(0);
    const again = await signIn.signIn(identity('root'));
    expect(again.id).toBe(stranded.id);
    expect(again.role).toBe('admin');
    expect(repo.auditEvents.map((e) => e.action)).toContain('auth.bootstrap_admin');
  });

  it('never lets AUTH_DEFAULT_ROLE grant admin or accept unknown roles', () => {
    expect(() => loadAuthConfig({ AUTH_DEFAULT_ROLE: 'admin' })).toThrow('must not be admin');
    expect(() => loadAuthConfig({ AUTH_DEFAULT_ROLE: 'root' })).toThrow('AUTH_DEFAULT_ROLE');
    expect(loadAuthConfig({}).defaultRole).toBe('viewer');
  });
});
