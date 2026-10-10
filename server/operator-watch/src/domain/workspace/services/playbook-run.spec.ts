import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../../../app.module';
import { RunService } from './run.service';
import { WorkspaceService } from './workspace.service';

/** With the case workflow retired (no OW_CASES), a run only refreshes playbook status: no cases, no drafts. */
describe('playbook-only run', () => {
  let app: NestFastifyApplication;
  const saved = { ...process.env };

  beforeAll(async () => {
    for (const k of ['DATABASE_URL', 'CRM_SOURCE', 'HUBSPOT_ACCESS_TOKEN', 'ANTHROPIC_API_KEY']) delete process.env[k];
    delete process.env.OW_CASES;
    process.env.WORKSPACE_WORKERS = 'false';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    process.env = saved;
  });

  it('completes straight away with no case for any account', async () => {
    const runs = app.get(RunService);
    const run = await runs.startRun('manual', 'test');
    expect(run?.agent).toBe('playbook');
    const done = await runs.latestRun();
    expect(done?.status).toBe('completed');
    expect(done?.summary).toMatch(/^Playbook status updated for \d+ accounts$/);
    const views = await app.get(WorkspaceService).list();
    expect(views.length).toBeGreaterThan(0);
    expect(views.every((v) => v.state === 'no_case' && !v.drafted)).toBe(true);
    expect(views.every((v) => !!v.playbook.name)).toBe(true);
  });
});
