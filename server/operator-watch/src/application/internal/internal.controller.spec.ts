import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { RunService } from '../../domain/workspace/services/run.service';
import { SendingService } from '../../domain/workspace/services/sending.service';
import { ClaudeRunWorker } from '../../infrastructure/claude/claude-run.worker';
import { InternalController } from './internal.controller';

describe('InternalController /internal/tick', () => {
  const saved = process.env.CRON_SECRET;
  afterEach(() => {
    if (saved === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = saved;
  });
  const make = () => {
    const runs = { tick: jest.fn(async () => ({ id: 'run-1' })) };
    const sending = { processDue: jest.fn(async () => 2) };
    const agent = { processDue: jest.fn(async () => ({ assessed: 3, failed: 0, closed: 1 })) };
    return { runs, sending, agent, controller: new InternalController(runs as unknown as RunService, sending as unknown as SendingService, agent as unknown as ClaudeRunWorker) };
  };

  it('runs the scheduler, the send worker and the Claude queue once for the cron secret', async () => {
    process.env.CRON_SECRET = 'cron-secret-123';
    const { controller, runs, sending, agent } = make();
    const expected = { run: 'run-1', sent: 2, agent: { assessed: 3, failed: 0, closed: 1 } };
    expect(await controller.postTick('Bearer cron-secret-123')).toEqual(expected);
    expect(await controller.getTick('Bearer cron-secret-123')).toEqual(expected);
    expect(agent.processDue).toHaveBeenCalledTimes(2);
    expect(runs.tick).toHaveBeenCalledTimes(2);
    expect(sending.processDue).toHaveBeenCalledTimes(2);
  });

  it('refuses other callers, and everyone while no secret is set', async () => {
    process.env.CRON_SECRET = 'cron-secret-123';
    const { controller, runs } = make();
    await expect(controller.postTick('Bearer wrong')).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(controller.postTick(undefined)).rejects.toBeInstanceOf(UnauthorizedException);
    delete process.env.CRON_SECRET;
    await expect(controller.postTick('Bearer ')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(runs.tick).not.toHaveBeenCalled();
  });
});
