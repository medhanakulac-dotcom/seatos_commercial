import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../app.module';
import { MockAnalyticsAdapter, MockHubSpotAdapter, MockTmsAdapter } from './mocks/mock.adapters';
import { ReportingModule } from './reporting.module';
import { ReportingController } from './reporting.controller';
import { ReportingService } from './reporting.service';
import { AUTH_REPOSITORY, InMemoryAuthRepository } from '../auth/auth.repository';
import { IDENTITY_VERIFIER, StaticIdentityVerifier } from '../auth/identity.verifier';

function request(app: INestApplication, url: string, authorization?: string) {
  return app.getHttpAdapter().getInstance().inject({ method: 'GET', url, headers: authorization ? { authorization } : undefined });
}

describe('Reporting HTTP integration', () => {
  let app: NestFastifyApplication;
  let analytics: MockAnalyticsAdapter;
  let tms: MockTmsAdapter;
  let cookie: string;

  const saved = { ...process.env };

  beforeAll(async () => {
    delete process.env.DATABASE_URL; // hermetic: always the in-memory auth repository
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    analytics = app.get(MockAnalyticsAdapter);
    tms = app.get(MockTmsAdapter);
    const repo = app.get<InMemoryAuthRepository>(AUTH_REPOSITORY);
    const user = await repo.upsertUser({ subject: 'integration-user', email: 'integration@seatos.com', role: 'admin' });
    await repo.addMembership(user.id, 'operator-1');
    cookie = app.get<StaticIdentityVerifier>(IDENTITY_VERIFIER).add('integration-token', { sub: user.subject, email: user.email });
  });

  afterAll(async () => {
    await app.close();
    process.env = saved;
  });

  it('wires the reporting module and its controller/service', () => {
    expect(app.get(ReportingController)).toBeInstanceOf(ReportingController);
    expect(app.get(ReportingService)).toBeInstanceOf(ReportingService);
    expect(app.get(MockHubSpotAdapter)).toBeInstanceOf(MockHubSpotAdapter);
  });

  it('returns a valid usage request and calls the adapter with validated values', async () => {
    const usageSpy = jest.spyOn(analytics, 'usageByOperator');
    const response = await request(app, '/reporting/usage/operator-1?start=2026-01-01&end=2026-01-31', cookie);

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([expect.objectContaining({ eventName: 'export_clicked' })]);
    expect(usageSpy).toHaveBeenCalledWith('operator-1', '2026-01-01', '2026-01-31');
  });

  it.each([
    '/reporting/usage/operator-1',
    '/reporting/usage/operator-1?start=not-a-date&end=2026-01-31',
    '/reporting/usage/operator-1?start=2026-02-01&end=2026-01-31',
    '/reporting/tms/operator-1?start=2026-01-01',
  ])('returns 400 and does not call adapters for invalid request: %s', async (url) => {
    const usageSpy = jest.spyOn(analytics, 'usageByOperator');
    const tmsSpy = jest.spyOn(tms, 'usageSummary');
    usageSpy.mockClear();
    tmsSpy.mockClear();
    const response = await request(app, url, cookie);

    expect(response.statusCode).toBe(400);
    expect(usageSpy).not.toHaveBeenCalled();
    expect(tmsSpy).not.toHaveBeenCalled();
  });

  it('returns 401 without a session', async () => {
    const response = await request(app, '/reporting/usage/operator-1?start=2026-01-01&end=2026-01-31');
    expect(response.statusCode).toBe(401);
  });

  it('returns 400 for a blank operator id before the adapter is called', async () => {
    const response = await request(app, '/reporting/usage/%20?start=2026-01-01&end=2026-01-31', cookie);
    expect(response.statusCode).toBe(400);
  });
});

describe('ReportingModule DI', () => {
  it('compiles with all reporting ports wired', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [ReportingModule] }).compile();
    expect(moduleRef.get(ReportingController)).toBeInstanceOf(ReportingController);
    expect(moduleRef.get(ReportingService)).toBeInstanceOf(ReportingService);
    await moduleRef.close();
  });
});
