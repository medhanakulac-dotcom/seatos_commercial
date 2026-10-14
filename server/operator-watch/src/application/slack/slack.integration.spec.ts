import 'reflect-metadata';
import { createHmac } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../../app.module';
import { TMS_DIRECTORY } from '../../domain/workspace/types/repositories/workspace.ports';

const SECRET = 'slack-signing-secret-for-tests';

/** Slack's request goes through the real app: raw-body signature check, challenge, and the 503/401 paths. */
describe('Slack events HTTP integration', () => {
  let app: NestFastifyApplication;
  const saved = { ...process.env };

  const post = (body: unknown, opts: { secret?: string; stale?: boolean; unsigned?: boolean } = {}) => {
    const raw = JSON.stringify(body);
    const ts = String(Math.floor(Date.now() / 1000) - (opts.stale ? 3600 : 0));
    const sig = `v0=${createHmac('sha256', opts.secret ?? SECRET).update(`v0:${ts}:${raw}`).digest('hex')}`;
    return app.getHttpAdapter().getInstance().inject({
      method: 'POST',
      url: '/slack/events',
      headers: { 'content-type': 'application/json', ...(opts.unsigned ? {} : { 'x-slack-request-timestamp': ts, 'x-slack-signature': sig }) },
      payload: raw,
    });
  };

  const boot = async (env: Record<string, string | undefined>) => {
    for (const k of ['DATABASE_URL', 'CRM_SOURCE', 'HUBSPOT_ACCESS_TOKEN', 'ANTHROPIC_API_KEY', 'SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET']) delete process.env[k];
    Object.assign(process.env, { WORKSPACE_WORKERS: 'false' }, env);
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(TMS_DIRECTORY).useValue({ connected: false, findOperators: async () => [] }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), { rawBody: true });
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  };

  afterEach(async () => {
    await app?.close();
  });
  afterAll(() => {
    process.env = saved;
  });

  it('is off (503) until the Slack settings exist', async () => {
    await boot({});
    expect((await post({ type: 'url_verification', challenge: 'c' })).statusCode).toBe(503);
  });

  it('answers Slack\'s challenge only when the signature is right and fresh', async () => {
    await boot({ SLACK_BOT_TOKEN: 'xoxb-test', SLACK_SIGNING_SECRET: SECRET });
    const ok = await post({ type: 'url_verification', challenge: 'abc123' });
    expect(ok.statusCode).toBe(200);
    expect(ok.json()).toEqual({ challenge: 'abc123' });
    expect((await post({ type: 'url_verification', challenge: 'x' }, { secret: 'wrong' })).statusCode).toBe(401);
    expect((await post({ type: 'url_verification', challenge: 'x' }, { stale: true })).statusCode).toBe(401);
    expect((await post({ type: 'url_verification', challenge: 'x' }, { unsigned: true })).statusCode).toBe(401);
  });
});
