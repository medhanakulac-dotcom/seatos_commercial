import { AuthRepository } from './auth.repository';
import { Permission } from './permissions';
import { RolePolicy } from './role.policy';

export type { Permission } from './permissions';

/** Answers "may this user do this?" from the stored role, the RolePolicy and operator memberships. Fails closed. */
export class RbacService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly policy: RolePolicy,
  ) {}

  async can(userId: string, permission: Permission, operatorId?: string): Promise<boolean> {
    const user = await this.repository.getUser(userId);
    if (!user?.active) return false;
    if (!(await this.policy.permissionsFor(user.role)).has(permission)) return false;
    if (this.policy.scopeOf(permission) === 'team' || this.policy.bypassesOperatorScope(user.role)) return true;
    return operatorId !== undefined && this.repository.hasMembership(userId, operatorId);
  }

  /** Every permission the user's role grants (operator-scoped ones still need a membership). Empty for unknown or inactive users. */
  async permissionsOf(userId: string): Promise<Permission[]> {
    const user = await this.repository.getUser(userId);
    if (!user?.active) return [];
    return [...(await this.policy.permissionsFor(user.role))].sort();
  }

  async allOperators(userId: string): Promise<boolean> {
    const user = await this.repository.getUser(userId);
    return !!user?.active && this.policy.bypassesOperatorScope(user.role);
  }

  audit(userId: string, action: string, operatorId?: string, detail?: Record<string, unknown>): Promise<void> {
    return this.repository.audit(userId, action, operatorId, detail);
  }
}
