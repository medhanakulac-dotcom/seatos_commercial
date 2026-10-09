import { InMemoryAuthRepository } from './auth.repository';
import { RbacService } from './rbac.service';
import { StaticRolePolicy } from './role.policy';

describe('Users', () => {
  it('does not allow a changed subject for an existing user', async () => {
    const repo = new InMemoryAuthRepository();
    const user = await repo.upsertUser({ subject: 'google-sub', email: 'person@seatos.com' });
    await expect(repo.upsertUser({ subject: 'different', email: 'person@seatos.com', id: user.id })).rejects.toThrow();
  });
});

describe('RBAC', () => {
  const repo = new InMemoryAuthRepository();
  const rbac = new RbacService(repo, new StaticRolePolicy());
  it('fails closed and enforces role/operator scope', async () => {
    const admin = await repo.upsertUser({ subject: 'a', email: 'a@seatos.com', role: 'admin' });
    const analyst = await repo.upsertUser({ subject: 'b', email: 'b@seatos.com', role: 'analyst' });
    const viewer = await repo.upsertUser({ subject: 'c', email: 'c@seatos.com', role: 'viewer' });
    await repo.addMembership(analyst.id, 'op-1');
    await repo.addMembership(viewer.id, 'op-1');
    expect(await rbac.can(admin.id, 'admin:manage_users', 'unknown')).toBe(true);
    expect(await rbac.can(analyst.id, 'dashboard:read', 'op-1')).toBe(true);
    expect(await rbac.can(analyst.id, 'dashboard:read', 'op-2')).toBe(false);
    expect(await rbac.can(analyst.id, 'dashboard:read')).toBe(false);
    expect(await rbac.can(viewer.id, 'dashboard:export', 'op-1')).toBe(false);
    expect(await rbac.can('missing', 'dashboard:read', 'op-1')).toBe(false);
  });
});
