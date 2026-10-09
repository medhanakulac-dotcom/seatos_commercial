import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../../../app.module';
import { TMS_DIRECTORY, WORKSPACE_STORE, WorkspaceStore } from '../types/repositories/workspace.ports';
import { RunService } from './run.service';

/** A built-in run cut off by the function time limit is finished by the next scheduler tick, without redoing cases. */
describe('RunService: resuming a cut-off local run', () => {
  let app: NestFastifyApplication;
  const saved = { ...process.env };

  beforeAll(async () => {
    for (const k of ['DATABASE_URL', 'CRM_SOURCE', 'HUBSPOT_ACCESS_TOKEN', 'ANTHROPIC_API_KEY']) delete process.env[k];
    process.env.WORKSPACE_WORKERS = 'false';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TMS_DIRECTORY)
      .useValue({ connected: false, findOperators: async () => [] })
      .compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    process.env = saved;
  });

  it('finishes only the operators that have no case yet, then completes the run', async () => {
    const runs = app.get(RunService);
    const store = app.get<WorkspaceStore>(WORKSPACE_STORE);
    const run = (await runs.startRun('manual', 'test'))!;
    const total = (await store.casesForRun(run.id)).length;
    expect(total).toBeGreaterThan(40);

    // Pretend the function stopped mid-run 10 minutes ago, before the run was closed.
    const stored = (await store.getRun(run.id))!;
    await store.updateRun({ ...stored, status: 'running', completedAt: null, summary: null, startedAt: new Date(Date.now() - 10 * 60_000).toISOString() });
    expect((await store.getRun(run.id))!.status).toBe('running');
    const draftsBefore = (await store.casesForRun(run.id)).map((c) => c.currentDraftId);

    await runs.tick();

    expect((await store.getRun(run.id))!.status).toBe('completed');
    const after = await store.casesForRun(run.id);
    expect(after).toHaveLength(total);
    expect(after.map((c) => c.currentDraftId)).toEqual(draftsBefore); // nothing was assessed twice
  });

  it('leaves a run that is still young alone', async () => {
    const runs = app.get(RunService);
    const store = app.get<WorkspaceStore>(WORKSPACE_STORE);
    const run = (await runs.startRun('manual', 'test'))!;
    await store.updateRun({ ...(await store.getRun(run.id))!, status: 'running', completedAt: null });
    await runs.tick();
    expect((await store.getRun(run.id))!.status).toBe('running');
  });
});
