import { isRole, Role } from './permissions';

export interface AuthConfig {
  /** Emails that become administrators: on first sign-in, or at any sign-in while the system has no active administrator. */
  adminEmails: readonly string[];
  /** Role given to a user the first time they sign in (unless an administrator, see adminEmails). */
  defaultRole: Role;
}

export const AUTH_CONFIG = Symbol('AUTH_CONFIG');

export function loadAuthConfig(env: NodeJS.ProcessEnv = process.env): AuthConfig {
  const defaultRole = env.AUTH_DEFAULT_ROLE || 'viewer';
  if (!isRole(defaultRole)) throw new Error(`AUTH_DEFAULT_ROLE must be one of admin, analyst, viewer (got "${defaultRole}")`);
  if (defaultRole === 'admin') throw new Error('AUTH_DEFAULT_ROLE must not be admin; list administrators in AUTH_ADMIN_EMAILS');
  return {
    adminEmails: (env.AUTH_ADMIN_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
    defaultRole,
  };
}
