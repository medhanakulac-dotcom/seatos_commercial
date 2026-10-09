import { randomUUID } from 'node:crypto';
import { Pool, QueryResultRow } from 'pg';
import { AuthRepository, DEV_SUBJECT_PREFIX, EmailConflictError, LastAdminError, User } from '../../auth/auth.repository';
import { Role } from '../../auth/permissions';

type Row = QueryResultRow;

const iso = (v: unknown): string => (v instanceof Date ? v.toISOString() : String(v));

const toUser = (r: Row): User => ({
  id: r.id,
  subject: r.subject,
  email: r.email,
  role: r.role,
  active: r.active,
  createdAt: iso(r.created_at),
  lastLoginAt: r.last_login_at == null ? null : iso(r.last_login_at),
});

const UNIQUE_VIOLATION = '23505';

/** Postgres adapter (tables from migrations/003_auth.sql). */
export class PgAuthRepository implements AuthRepository {
  constructor(private readonly pool: Pool) {}

  async upsertUser(input: { subject: string; email: string; role?: Role; id?: string }): Promise<User> {
    const email = input.email.toLowerCase();
    if (input.id !== undefined) {
      const byId = await this.pool.query('select subject from auth_users where id = $1', [input.id]);
      if (byId.rows[0] && byId.rows[0].subject !== input.subject) throw new Error('Google subject ID is immutable');
    }
    try {
      if (!input.subject.startsWith(DEV_SUBJECT_PREFIX)) {
        // A dev sign-in placeholder for this email is claimed by the first real Google account that uses it.
        const claimed = await this.pool.query(
          `update auth_users set subject = $1, last_login_at = now(), updated_at = now()
           where lower(email) = $2 and subject like $3 and subject <> $1
           returning *`,
          [input.subject, email, `${DEV_SUBJECT_PREFIX}%`],
        );
        if (claimed.rows[0]) return toUser(claimed.rows[0]);
      }
      const { rows } = await this.pool.query(
        `insert into auth_users (id, subject, email, role, last_login_at)
         values ($1, $2, $3, $4, now())
         on conflict (subject) do update set email = excluded.email, last_login_at = now(), updated_at = now()
         returning *`,
        [input.id ?? randomUUID(), input.subject, email, input.role ?? 'viewer'],
      );
      return toUser(rows[0]);
    } catch (error) {
      if ((error as { code?: string }).code === UNIQUE_VIOLATION) throw new EmailConflictError(email);
      throw error;
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    const { rows } = await this.pool.query('select * from auth_users where id = $1', [id]);
    return rows[0] ? toUser(rows[0]) : undefined;
  }

  async listUsers(): Promise<User[]> {
    const { rows } = await this.pool.query('select * from auth_users order by lower(email)');
    return rows.map(toUser);
  }

  async countActiveAdmins(): Promise<number> {
    const { rows } = await this.pool.query("select count(*)::int as n from auth_users where role = 'admin' and active");
    return rows[0].n;
  }

  setRole(id: string, role: Role): Promise<User | undefined> {
    return this.change(id, role, undefined);
  }

  setActive(id: string, active: boolean): Promise<User | undefined> {
    return this.change(id, undefined, active);
  }

  /** Locks the active-admin rows so two concurrent demotions cannot both pass the last-admin check. */
  private async change(id: string, role: Role | undefined, active: boolean | undefined): Promise<User | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const admins = (await client.query("select id from auth_users where role = 'admin' and active for update")).rows.map((r) => r.id as string);
      const current = (await client.query('select * from auth_users where id = $1 for update', [id])).rows[0];
      if (!current) {
        await client.query('rollback');
        return undefined;
      }
      const nextRole = role ?? current.role;
      const nextActive = active ?? current.active;
      const losesAdmin = admins.includes(id) && !(nextActive && nextRole === 'admin');
      if (losesAdmin && admins.length <= 1) {
        await client.query('rollback');
        throw new LastAdminError();
      }
      const { rows } = await client.query('update auth_users set role = $2, active = $3, updated_at = now() where id = $1 returning *', [id, nextRole, nextActive]);
      await client.query('commit');
      return toUser(rows[0]);
    } catch (error) {
      await client.query('rollback').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async addMembership(userId: string, operatorId: string): Promise<void> {
    await this.pool.query('insert into auth_operator_memberships (user_id, operator_id) values ($1, $2) on conflict do nothing', [userId, operatorId]);
  }

  async hasMembership(userId: string, operatorId: string): Promise<boolean> {
    const { rowCount } = await this.pool.query('select 1 from auth_operator_memberships where user_id = $1 and operator_id = $2', [userId, operatorId]);
    return (rowCount ?? 0) > 0;
  }

  async listMemberships(userId: string): Promise<string[]> {
    const { rows } = await this.pool.query('select operator_id from auth_operator_memberships where user_id = $1 order by operator_id', [userId]);
    return rows.map((r) => r.operator_id as string);
  }

  async setMemberships(userId: string, operatorIds: readonly string[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      await client.query('delete from auth_operator_memberships where user_id = $1', [userId]);
      if (operatorIds.length > 0) {
        await client.query('insert into auth_operator_memberships (user_id, operator_id) select $1, unnest($2::text[]) on conflict do nothing', [userId, [...operatorIds]]);
      }
      await client.query('commit');
    } catch (error) {
      await client.query('rollback').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async audit(userId: string, action: string, operatorId?: string, detail?: Record<string, unknown>): Promise<void> {
    await this.pool.query('insert into auth_audit_events (user_id, action, operator_id, detail) values ($1, $2, $3, $4)', [userId, action, operatorId ?? null, detail ? JSON.stringify(detail) : null]);
  }
}
