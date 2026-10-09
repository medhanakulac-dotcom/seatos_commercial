import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AUTH_REPOSITORY, AuthRepository, LastAdminError, User } from './auth.repository';
import { ROLES, Role, isRole } from './permissions';
import { displayNameOf } from './display-name';

export interface AdminUserView {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  operatorIds: string[];
}

/** Administrator actions on users. Every change is audited with the acting administrator. */
@Injectable()
export class UserAdminService {
  constructor(@Inject(AUTH_REPOSITORY) private readonly repository: AuthRepository) {}

  async list(): Promise<AdminUserView[]> {
    const users = await this.repository.listUsers();
    return Promise.all(users.map((u) => this.view(u)));
  }

  async changeRole(actorId: string, targetId: string, role: unknown): Promise<AdminUserView> {
    if (!isRole(role)) throw new BadRequestException(`role must be one of: ${ROLES.join(', ')}`);
    const before = await this.require(targetId);
    const after = await this.guardLastAdmin(() => this.repository.setRole(targetId, role));
    if (!after) throw new NotFoundException('User not found');
    if (before.role !== after.role) await this.repository.audit(actorId, 'admin.user_role_changed', undefined, { targetUserId: targetId, from: before.role, to: after.role });
    return this.view(after);
  }

  async setActive(actorId: string, targetId: string, active: unknown): Promise<AdminUserView> {
    if (typeof active !== 'boolean') throw new BadRequestException('active must be a boolean');
    const before = await this.require(targetId);
    const after = await this.guardLastAdmin(() => this.repository.setActive(targetId, active));
    if (!after) throw new NotFoundException('User not found');
    if (before.active !== after.active) await this.repository.audit(actorId, active ? 'admin.user_activated' : 'admin.user_deactivated', undefined, { targetUserId: targetId });
    return this.view(after);
  }

  async setOperators(actorId: string, targetId: string, operatorIds: readonly string[]): Promise<AdminUserView> {
    const user = await this.require(targetId);
    const before = await this.repository.listMemberships(targetId);
    const after = [...new Set(operatorIds)].sort();
    await this.repository.setMemberships(targetId, after);
    if (before.join() !== after.join()) await this.repository.audit(actorId, 'admin.user_operators_changed', undefined, { targetUserId: targetId, from: before, to: after });
    return this.view(user);
  }

  private async require(id: string): Promise<User> {
    const user = await this.repository.getUser(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private async guardLastAdmin(change: () => Promise<User | undefined>): Promise<User | undefined> {
    try {
      return await change();
    } catch (error) {
      if (error instanceof LastAdminError) throw new BadRequestException(error.message);
      throw error;
    }
  }

  private async view(user: User): Promise<AdminUserView> {
    return {
      id: user.id,
      email: user.email,
      name: displayNameOf(user.email),
      role: user.role,
      active: user.active,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      operatorIds: await this.repository.listMemberships(user.id),
    };
  }
}
