import { Role } from './permissions';

export type { Role } from './permissions';

export interface User {
  readonly id: string;
  readonly subject: string;
  readonly email: string;
  readonly role: Role;
  readonly active: boolean;
  readonly createdAt: string;
  readonly lastLoginAt: string | null;
}

export interface AuditEvent {
  readonly id: string;
  readonly userId: string;
  readonly action: string;
  readonly operatorId?: string;
  readonly detail?: Record<string, unknown>;
  readonly at: Date;
}

/** Raised instead of leaving the system without an active administrator. */
export class LastAdminError extends Error {
  constructor() {
    super('At least one active administrator is required');
    this.name = 'LastAdminError';
  }
}

/** Another Google account already owns this email. */
export class EmailConflictError extends Error {
  constructor(email: string) {
    super(`Email ${email} already belongs to a different Google account`);
    this.name = 'EmailConflictError';
  }
}

/** Subject prefix of the placeholder users made by local dev sign-in; a verified Google sign-in may claim them. */
export const DEV_SUBJECT_PREFIX = 'dev:';

export interface AuthRepository {
  /**
   * Records a sign-in. Creates the user with `role` on first sight of `subject`; an existing user keeps their
   * stored role (roles are changed only through setRole). The Google subject is immutable, with one exception: a
   * placeholder made by dev sign-in (`dev:<email>`) is claimed, keeping its id and role, by the first real Google
   * account that signs in with that email. Throws EmailConflictError if a different real account owns the email.
   */
  upsertUser(input: { subject: string; email: string; role?: Role; id?: string }): Promise<User>;
  getUser(id: string): Promise<User | undefined>;
  listUsers(): Promise<User[]>;
  countActiveAdmins(): Promise<number>;
  /** Both throw LastAdminError if the change would leave no active administrator. Undefined when the user is unknown. */
  setRole(id: string, role: Role): Promise<User | undefined>;
  setActive(id: string, active: boolean): Promise<User | undefined>;
  addMembership(userId: string, operatorId: string): Promise<void>;
  hasMembership(userId: string, operatorId: string): Promise<boolean>;
  listMemberships(userId: string): Promise<string[]>;
  /** Replaces the user's operator memberships with exactly `operatorIds`. */
  setMemberships(userId: string, operatorIds: readonly string[]): Promise<void>;
  audit(userId: string, action: string, operatorId?: string, detail?: Record<string, unknown>): Promise<void>;
}

export const AUTH_REPOSITORY = Symbol('AUTH_REPOSITORY');

/** Dev/test-only adapter: process-local, lost on restart. Production requires the Postgres adapter. */
export class InMemoryAuthRepository implements AuthRepository {
  private readonly users = new Map<string, User>();
  private readonly memberships = new Map<string, Set<string>>();
  readonly auditEvents: AuditEvent[] = [];
  private sequence = 0;

  async upsertUser(input: { subject: string; email: string; role?: Role; id?: string }): Promise<User> {
    const email = input.email.toLowerCase();
    const claimable = input.subject.startsWith(DEV_SUBJECT_PREFIX)
      ? undefined
      : [...this.users.values()].find((u) => u.email === email && u.subject.startsWith(DEV_SUBJECT_PREFIX));
    if (claimable) {
      const claimed = { ...claimable, subject: input.subject, lastLoginAt: new Date().toISOString() };
      this.users.set(claimable.id, claimed);
      return claimed;
    }
    const existing = [...this.users.values()].find((u) => u.subject === input.subject || (input.id !== undefined && u.id === input.id));
    if (!existing && [...this.users.values()].some((u) => u.email === email)) throw new EmailConflictError(email);
    if (existing) {
      if (existing.subject !== input.subject) throw new Error('Google subject ID is immutable');
      const updated = { ...existing, email: input.email.toLowerCase(), lastLoginAt: new Date().toISOString() };
      this.users.set(existing.id, updated);
      return updated;
    }
    const now = new Date().toISOString();
    const user: User = {
      id: input.id ?? `user-${++this.sequence}`,
      subject: input.subject,
      email: input.email.toLowerCase(),
      role: input.role ?? 'viewer',
      active: true,
      createdAt: now,
      lastLoginAt: now,
    };
    this.users.set(user.id, user);
    return user;
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async listUsers(): Promise<User[]> {
    return [...this.users.values()].sort((a, b) => a.email.localeCompare(b.email));
  }

  async countActiveAdmins(): Promise<number> {
    return [...this.users.values()].filter((u) => u.active && u.role === 'admin').length;
  }

  async setRole(id: string, role: Role): Promise<User | undefined> {
    return this.change(id, { role });
  }

  async setActive(id: string, active: boolean): Promise<User | undefined> {
    return this.change(id, { active });
  }

  private async change(id: string, patch: Partial<Pick<User, 'role' | 'active'>>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const next = { ...user, ...patch };
    const losesAdmin = user.active && user.role === 'admin' && !(next.active && next.role === 'admin');
    if (losesAdmin && (await this.countActiveAdmins()) <= 1) throw new LastAdminError();
    this.users.set(id, next);
    return next;
  }

  async addMembership(userId: string, operatorId: string): Promise<void> {
    const set = this.memberships.get(userId) ?? new Set<string>();
    set.add(operatorId);
    this.memberships.set(userId, set);
  }

  async hasMembership(userId: string, operatorId: string): Promise<boolean> {
    return this.memberships.get(userId)?.has(operatorId) ?? false;
  }

  async listMemberships(userId: string): Promise<string[]> {
    return [...(this.memberships.get(userId) ?? [])].sort();
  }

  async setMemberships(userId: string, operatorIds: readonly string[]): Promise<void> {
    this.memberships.set(userId, new Set(operatorIds));
  }

  async audit(userId: string, action: string, operatorId?: string, detail?: Record<string, unknown>): Promise<void> {
    this.auditEvents.push({ id: `audit-${this.auditEvents.length + 1}`, userId, action, operatorId, detail, at: new Date() });
  }
}
