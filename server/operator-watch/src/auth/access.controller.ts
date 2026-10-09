import { BadRequestException, Body, Controller, Get, Inject, Param, Put, Req, UseGuards } from '@nestjs/common';
import { JsonRequestGuard } from '../application/workspace/dto/requests/workspace.validation';
import { AuthenticatedUser, RbacGuard, RequirePermission, SessionGuard } from './guards';
import { PERMISSIONS, ROLES } from './permissions';
import { ROLE_POLICY, RolePolicy } from './role.policy';
import { UserAdminService } from './user-admin.service';

interface AuthedRequest { user?: AuthenticatedUser }

const USER_ID = /^[\w-]{1,64}$/;
const OPERATOR_ID = /^[\w.:-]{1,64}$/;
const MAX_OPERATORS = 500;

function userId(value: string): string {
  if (!USER_ID.test(value)) throw new BadRequestException('Invalid user id');
  return value;
}

function bodyOf(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new BadRequestException('Body must be a JSON object');
  return value as Record<string, unknown>;
}

function operatorIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > MAX_OPERATORS || !value.every((v) => typeof v === 'string' && OPERATOR_ID.test(v))) {
    throw new BadRequestException(`operatorIds must be an array of at most ${MAX_OPERATORS} operator ids`);
  }
  return value;
}

/** User, role and operator-access management. Administrators only (`admin:manage_users`). */
@Controller('admin')
@UseGuards(SessionGuard, RbacGuard, JsonRequestGuard)
@RequirePermission('admin:manage_users')
export class AccessController {
  constructor(
    private readonly users: UserAdminService,
    @Inject(ROLE_POLICY) private readonly policy: RolePolicy,
  ) {}

  @Get('users')
  async list() {
    return { users: await this.users.list(), roles: ROLES };
  }

  @Put('users/:id/role')
  changeRole(@Param('id') id: string, @Body() body: unknown, @Req() req: AuthedRequest) {
    return this.users.changeRole(req.user!.id, userId(id), bodyOf(body).role);
  }

  @Put('users/:id/active')
  setActive(@Param('id') id: string, @Body() body: unknown, @Req() req: AuthedRequest) {
    return this.users.setActive(req.user!.id, userId(id), bodyOf(body).active);
  }

  /** Replaces the operators this user may access under operator-scoped permissions (admins span all operators). */
  @Put('users/:id/operators')
  setOperators(@Param('id') id: string, @Body() body: unknown, @Req() req: AuthedRequest) {
    return this.users.setOperators(req.user!.id, userId(id), operatorIds(bodyOf(body).operatorIds));
  }

  /** The active role → permission policy, for the admin UI. */
  @Get('rbac')
  async rbac() {
    return {
      permissions: PERMISSIONS.map((permission) => ({ permission, scope: this.policy.scopeOf(permission) })),
      roles: await Promise.all(
        ROLES.map(async (role) => ({
          role,
          permissions: [...(await this.policy.permissionsFor(role))].sort(),
          allOperators: this.policy.bypassesOperatorScope(role),
        })),
      ),
    };
  }
}
