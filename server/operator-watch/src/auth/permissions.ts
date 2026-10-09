export const ROLES = ['admin', 'analyst', 'viewer'] as const;
export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

/**
 * `team`: the role alone grants it. `operator`: the role must grant it AND the user must be a member of the
 * operator in question (unless the role spans all operators, see RolePolicy.bypassesOperatorScope).
 */
export type PermissionScope = 'team' | 'operator';

export const PERMISSION_SCOPES = {
  'dashboard:read': 'operator',
  'dashboard:export': 'operator',
  'workspace:read': 'team',
  'workspace:review': 'team',
  'admin:settings': 'team',
  'admin:manage_users': 'team',
} as const satisfies Record<string, PermissionScope>;

export type Permission = keyof typeof PERMISSION_SCOPES;
export const PERMISSIONS = Object.keys(PERMISSION_SCOPES) as Permission[];
