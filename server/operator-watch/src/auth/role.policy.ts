import { PERMISSION_SCOPES, Permission, PermissionScope, Role } from './permissions';

/**
 * The role → permission policy. RbacService asks this and nothing else, so the static matrix below can be
 * replaced (e.g. by a database-backed, admin-editable policy) by rebinding ROLE_POLICY.
 */
export interface RolePolicy {
  permissionsFor(role: Role): Promise<ReadonlySet<Permission>>;
  scopeOf(permission: Permission): PermissionScope;
  /** True when the role spans every operator, so operator-scoped permissions need no membership. */
  bypassesOperatorScope(role: Role): boolean;
}

export const ROLE_POLICY = Symbol('ROLE_POLICY');

export const DEFAULT_ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> = {
  admin: ['dashboard:read', 'dashboard:export', 'workspace:read', 'workspace:review', 'admin:settings', 'admin:manage_users'],
  analyst: ['dashboard:read', 'dashboard:export', 'workspace:read', 'workspace:review'],
  viewer: ['dashboard:read', 'workspace:read'],
};

export const DEFAULT_ALL_OPERATOR_ROLES: readonly Role[] = ['admin'];

export class StaticRolePolicy implements RolePolicy {
  constructor(
    private readonly matrix: Readonly<Record<Role, readonly Permission[]>> = DEFAULT_ROLE_PERMISSIONS,
    private readonly allOperatorRoles: readonly Role[] = DEFAULT_ALL_OPERATOR_ROLES,
  ) {}

  async permissionsFor(role: Role): Promise<ReadonlySet<Permission>> {
    return new Set(this.matrix[role] ?? []);
  }

  scopeOf(permission: Permission): PermissionScope {
    return PERMISSION_SCOPES[permission];
  }

  bypassesOperatorScope(role: Role): boolean {
    return this.allOperatorRoles.includes(role);
  }
}
