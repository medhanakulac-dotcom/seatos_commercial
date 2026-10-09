import { Module } from '@nestjs/common';
import { Pool } from 'pg';
import { DatabaseModule, PG_POOL } from '../infrastructure/database/database.module';
import { PgAuthRepository } from '../infrastructure/auth-repository/pg-auth.repository';
import { AccessController } from './access.controller';
import { AUTH_CONFIG, loadAuthConfig } from './auth.config';
import { AUTH_REPOSITORY, AuthRepository, InMemoryAuthRepository } from './auth.repository';
import { RbacGuard, SessionGuard } from './guards';
import { createIdentityVerifier, IDENTITY_VERIFIER } from './identity.verifier';
import { RbacService } from './rbac.service';
import { ROLE_POLICY, RolePolicy, StaticRolePolicy } from './role.policy';
import { SessionController } from './session.controller';
import { SignInService } from './sign-in.service';
import { UserAdminService } from './user-admin.service';

@Module({
  imports: [DatabaseModule],
  controllers: [SessionController, AccessController],
  providers: [
    {
      provide: AUTH_REPOSITORY,
      inject: [PG_POOL],
      useFactory: (pool: Pool | null): AuthRepository => {
        if (pool) return new PgAuthRepository(pool);
        if (process.env.NODE_ENV === 'production') throw new Error('Durable AUTH_REPOSITORY provider is required in production');
        return new InMemoryAuthRepository();
      },
    },
    { provide: AUTH_CONFIG, useFactory: () => loadAuthConfig() },
    { provide: IDENTITY_VERIFIER, inject: [PG_POOL], useFactory: (pool: Pool | null) => createIdentityVerifier(pool) },
    // Rebind ROLE_POLICY to change what roles may do (e.g. a database-backed, admin-editable policy).
    { provide: ROLE_POLICY, useFactory: (): RolePolicy => new StaticRolePolicy() },
    { provide: RbacService, inject: [AUTH_REPOSITORY, ROLE_POLICY], useFactory: (repo: AuthRepository, policy: RolePolicy) => new RbacService(repo, policy) },
    SignInService,
    SessionGuard,
    RbacGuard,
    UserAdminService,
  ],
  exports: [AUTH_REPOSITORY, AUTH_CONFIG, ROLE_POLICY, RbacService, SignInService, SessionGuard, RbacGuard, IDENTITY_VERIFIER],
})
export class AuthModule {}
