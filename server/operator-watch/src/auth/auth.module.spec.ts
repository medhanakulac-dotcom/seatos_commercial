import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { AUTH_REPOSITORY, InMemoryAuthRepository } from './auth.repository';
import { PG_POOL } from '../infrastructure/database/database.module';
import { AuthModule } from './auth.module';
import { createIdentityVerifier, SupabaseIdentityVerifier } from './identity.verifier';

describe('AuthModule persistence guard', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  const originalDatabaseUrl = process.env.DATABASE_URL;
  const saved = { ...process.env };

  beforeEach(() => {
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    for (const k of ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  });

  it('refuses to start in production without a database', async () => {
    process.env.NODE_ENV = 'production';

    await expect(Test.createTestingModule({ imports: [AuthModule] }).compile()).rejects.toThrow('DATABASE_URL is required in production');
  });

  it('fails closed in production when only the in-memory repository is available', async () => {
    process.env.NODE_ENV = 'production';

    await expect(
      Test.createTestingModule({ imports: [AuthModule] }).overrideProvider(PG_POOL).useValue(null).compile(),
    ).rejects.toThrow('Durable AUTH_REPOSITORY provider is required in production');
  });

  it('refuses to start in production without Supabase settings', async () => {
    process.env.NODE_ENV = 'production';
    for (const k of ['SUPABASE_URL', 'VITE_SUPABASE_URL']) delete process.env[k];
    await expect(
      Test.createTestingModule({ imports: [AuthModule] }).overrideProvider(PG_POOL).useValue(null).overrideProvider(AUTH_REPOSITORY).useValue({}).compile(),
    ).rejects.toThrow('SUPABASE_URL and SUPABASE_ANON_KEY are required in production');
  });

  it("falls back to the site's VITE_SUPABASE_* settings", () => {
    expect(createIdentityVerifier(null, { NODE_ENV: 'production', VITE_SUPABASE_URL: 'https://x.supabase.co', VITE_SUPABASE_ANON_KEY: 'k' })).toBeInstanceOf(SupabaseIdentityVerifier);
  });

  it('allows a durable repository provider in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon';
    const durableRepository = {
      upsertUser: jest.fn(),
      getUser: jest.fn(),
      listUsers: jest.fn(),
      countActiveAdmins: jest.fn(),
      setRole: jest.fn(),
      setActive: jest.fn(),
      addMembership: jest.fn(),
      hasMembership: jest.fn(),
      listMemberships: jest.fn(),
      setMemberships: jest.fn(),
      audit: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({ imports: [AuthModule] })
      .overrideProvider(PG_POOL)
      .useValue(null)
      .overrideProvider(AUTH_REPOSITORY)
      .useValue(durableRepository)
      .compile();

    expect(moduleRef.get(AUTH_REPOSITORY)).toBe(durableRepository);
    await moduleRef.close();
  });

  it('keeps the in-memory repository available outside production', async () => {
    process.env.NODE_ENV = 'test';

    const moduleRef = await Test.createTestingModule({ imports: [AuthModule] }).compile();

    expect(moduleRef.get(AUTH_REPOSITORY)).toBeInstanceOf(InMemoryAuthRepository);
    await moduleRef.close();
  });
});
