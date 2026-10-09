import { Inject, Injectable } from '@nestjs/common';
import { AUTH_CONFIG, AuthConfig } from './auth.config';
import { AUTH_REPOSITORY, AuthRepository, User } from './auth.repository';
import { VerifiedIdentity } from './identity.verifier';

/** Turns a verified identity (the main site's Supabase login) into a stored user with a role. */
@Injectable()
export class SignInService {
  /** subject → user id, so a user is recorded once per instance instead of on every request. */
  private readonly known = new Map<string, string>();

  constructor(
    @Inject(AUTH_REPOSITORY) private readonly repository: AuthRepository,
    @Inject(AUTH_CONFIG) private readonly config: AuthConfig,
  ) {}

  /** The stored user behind an identity, signing them in on first sight. The role is always the stored one. */
  async resolve(identity: VerifiedIdentity): Promise<User> {
    const id = this.known.get(identity.sub);
    const user = id ? await this.repository.getUser(id) : undefined;
    if (user) return user;
    const signedIn = await this.signIn(identity);
    this.known.set(identity.sub, signedIn.id);
    return signedIn;
  }

  /**
   * New users get AUTH_DEFAULT_ROLE, or admin when listed in AUTH_ADMIN_EMAILS or an admin of the main site.
   * Existing users keep their stored role, with one recovery exception: a listed email is promoted if the system has
   * no active administrator.
   */
  async signIn(identity: { sub: string; email: string; siteAdmin?: boolean }): Promise<User> {
    const email = identity.email.toLowerCase();
    const listed = this.config.adminEmails.includes(email) || !!identity.siteAdmin;
    let user = await this.repository.upsertUser({ subject: identity.sub, email, role: listed ? 'admin' : this.config.defaultRole });
    if (listed && user.active && user.role !== 'admin' && (await this.repository.countActiveAdmins()) === 0) {
      const promoted = await this.repository.setRole(user.id, 'admin');
      if (promoted) {
        user = promoted;
        await this.repository.audit(user.id, 'auth.bootstrap_admin');
      }
    }
    await this.repository.audit(user.id, user.active ? 'auth.login' : 'auth.login_denied_inactive');
    return user;
  }
}
