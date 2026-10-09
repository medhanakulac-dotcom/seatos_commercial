export type Role = 'admin' | 'analyst' | 'viewer';
export interface User { readonly id: string; readonly subject: string; readonly email: string; readonly role: Role; readonly active: boolean }
export interface AuditEvent { readonly id: string; readonly userId: string; readonly action: string; readonly operatorId?: string; readonly at: Date }

export interface AuthRepository {
  upsertUser(input: { subject: string; email: string; role?: Role; id?: string }): User;
  getUser(id: string): User | undefined;
  addMembership(userId: string, operatorId: string): void;
  hasMembership(userId: string, operatorId: string): boolean;
  audit(userId: string, action: string, operatorId?: string): void;
}

/** Dev-only adapter. Replace this binding with a durable adapter before production. */
export class InMemoryAuthRepository implements AuthRepository {
  private readonly users = new Map<string, User>();
  private readonly memberships = new Map<string, Set<string>>();
  readonly auditEvents: AuditEvent[] = [];
  private sequence = 0;
  upsertUser(input: { subject: string; email: string; role?: Role; id?: string }): User {
    const existing = [...this.users.values()].find((u) => u.subject === input.subject || (input.id !== undefined && u.id === input.id));
    if (existing) { if (existing.subject !== input.subject) throw new Error('Google subject ID is immutable'); const updated = { ...existing, email: input.email.toLowerCase() }; this.users.set(existing.id, updated); return updated; }
    const user: User = { id: input.id ?? `user-${++this.sequence}`, subject: input.subject, email: input.email.toLowerCase(), role: input.role ?? 'viewer', active: true };
    this.users.set(user.id, user); return user;
  }
  getUser(id: string): User | undefined { return this.users.get(id); }
  addMembership(userId: string, operatorId: string): void { const set = this.memberships.get(userId) ?? new Set<string>(); set.add(operatorId); this.memberships.set(userId, set); }
  hasMembership(userId: string, operatorId: string): boolean { return this.memberships.get(userId)?.has(operatorId) ?? false; }
  audit(userId: string, action: string, operatorId?: string): void { this.auditEvents.push({ id: `audit-${this.auditEvents.length + 1}`, userId, action, operatorId, at: new Date() }); }
}

export const AUTH_REPOSITORY = Symbol('AUTH_REPOSITORY');
