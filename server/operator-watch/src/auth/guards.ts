import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AUTH_REPOSITORY, AuthRepository, EmailConflictError } from './auth.repository';
import { IDENTITY_VERIFIER, IdentityVerifier } from './identity.verifier';
import { Permission } from './permissions';
import { RbacService } from './rbac.service';
import { SignInService } from './sign-in.service';

export const REQUIRED_PERMISSION = 'required_permission';
export const RequirePermission = (permission: Permission) => SetMetadata(REQUIRED_PERMISSION, permission);

/** Set on the request by SessionGuard. The role is always the stored one, never anything the browser sent. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}

/** `Authorization: Bearer <token>` → the token itself. */
export function bearerToken(header: string | string[] | undefined): string | undefined {
  const value = Array.isArray(header) ? header[0] : header;
  const match = value?.match(/^Bearer\s+(\S+)$/i);
  return match?.[1];
}

/**
 * Signs the request in with the main site's Supabase login: the browser sends its access token as a bearer token, the
 * verifier checks it, and the stored user (created on first sight) supplies the role. No cookies, so no CSRF surface.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    @Inject(IDENTITY_VERIFIER) private readonly verifier: IdentityVerifier,
    private readonly signIn: SignInService,
    @Inject(AUTH_REPOSITORY) private readonly repository: AuthRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ headers: { authorization?: string | string[] }; user?: AuthenticatedUser }>();
    const token = bearerToken(req.headers.authorization);
    const identity = token ? await this.verifier.verify(token) : undefined;
    if (!identity) throw new UnauthorizedException();
    let user;
    try {
      user = await this.signIn.resolve(identity);
    } catch (error) {
      if (error instanceof EmailConflictError) throw new ForbiddenException('This email already belongs to a different account');
      throw error;
    }
    if (!user.active) {
      await this.repository.audit(user.id, 'auth.authorization_failure');
      throw new UnauthorizedException();
    }
    req.user = { id: user.id, email: user.email, role: user.role };
    return true;
  }
}

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbac: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permission =
      this.reflector.get<Permission>(REQUIRED_PERMISSION, context.getHandler()) ?? this.reflector.get<Permission>(REQUIRED_PERMISSION, context.getClass());
    const req = context.switchToHttp().getRequest<{ user?: AuthenticatedUser; params: { operatorId?: string } }>();
    if (!permission || !req.user || !(await this.rbac.can(req.user.id, permission, req.params.operatorId))) {
      if (req.user) await this.rbac.audit(req.user.id, 'auth.authorization_denied', req.params.operatorId, permission ? { permission } : undefined);
      throw new ForbiddenException();
    }
    return true;
  }
}
