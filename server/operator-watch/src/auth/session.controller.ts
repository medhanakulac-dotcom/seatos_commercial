import { Controller, Get, Inject, NotFoundException, Req, UseGuards } from '@nestjs/common';
import { AUTH_REPOSITORY, AuthRepository } from './auth.repository';
import { displayNameOf } from './display-name';
import { AuthenticatedUser, SessionGuard } from './guards';
import { RbacService } from './rbac.service';

export { displayNameOf } from './display-name';

interface AuthedRequest { user?: AuthenticatedUser }

@Controller('auth')
export class SessionController {
  constructor(
    @Inject(AUTH_REPOSITORY) private readonly repository: AuthRepository,
    private readonly rbac: RbacService,
  ) {}

  /** The signed-in user, their role, and what that role permits (operator-scoped permissions additionally need a membership). */
  @Get('me')
  @UseGuards(SessionGuard)
  async me(@Req() request: AuthedRequest) {
    const user = request.user && (await this.repository.getUser(request.user.id));
    if (!user) throw new NotFoundException();
    return {
      id: user.id,
      email: user.email,
      name: displayNameOf(user.email),
      role: user.role,
      permissions: await this.rbac.permissionsOf(user.id),
      allOperators: await this.rbac.allOperators(user.id),
    };
  }

  /** Sign-in happens on the main site (Supabase); this API only accepts its bearer token. */
  @Get('methods')
  methods() {
    return { supabase: true };
  }
}
