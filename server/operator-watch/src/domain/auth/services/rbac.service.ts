import { AuthRepository, Role } from '../types/repositories/auth.repository';
export type Permission = 'dashboard:read' | 'dashboard:export' | 'admin:manage_users' | 'workspace:read' | 'workspace:review' | 'admin:settings';
/** Team-wide permissions: granted by role alone, not scoped to an operator membership. */
const TEAM_PERMISSIONS: readonly Permission[] = ['workspace:read', 'workspace:review'];
const permissions: Record<Role, readonly Permission[]> = { admin: ['dashboard:read', 'dashboard:export', 'admin:manage_users', 'workspace:read', 'workspace:review', 'admin:settings'], analyst: ['dashboard:read', 'dashboard:export', 'workspace:read', 'workspace:review'], viewer: ['dashboard:read', 'workspace:read'] };
export class RbacService {
  constructor(private readonly repository: AuthRepository) {}
  can(userId: string, permission: Permission, operatorId?: string): boolean { const user = this.repository.getUser(userId); if (!user?.active || !permissions[user.role].includes(permission)) return false; return user.role === 'admin' || TEAM_PERMISSIONS.includes(permission) || (operatorId !== undefined && this.repository.hasMembership(userId, operatorId)); }
  audit(userId: string, action: string, operatorId?: string): void { this.repository.audit(userId, action, operatorId); }
}
