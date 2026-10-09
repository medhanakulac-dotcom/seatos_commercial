import { Logger } from '@nestjs/common';
import { WorkspaceSettings } from '../../domain/workspace/services/settings';
import { AgentDispatch, AgentTrigger, RunStartedEvent } from '../../domain/workspace/types/repositories/workspace.ports';
import { HermesSessionClient } from './hermes-session.client';

const runMessage = (event: RunStartedEvent, playbookVersion: string): string =>
  `Operator Watch run ${event.label} (run_id ${event.runId}, trigger: ${event.trigger}, playbook ${playbookVersion || 'default'}) has started. ` +
  'Assess THIS operator only, following the operator-watch skill: read it with get_operator(run_id, operator_id), decide whether retention outreach is needed, ' +
  'then call submit_case once (needs_outreach + analysis, plus an email draft when outreach is needed). Do not call complete_run: the backend closes the run. ' +
  'Reply with one short line summarising the case.';

/**
 * Starts a run by messaging every operator's own Hermes session (same session the account chat uses), a few at a time,
 * so the analysis is remembered when the team later asks follow-ups or has the email rewritten.
 */
export class HermesSessionTrigger implements AgentTrigger {
  private readonly logger = new Logger(HermesSessionTrigger.name);

  constructor(
    private readonly sessions: HermesSessionClient,
    private readonly concurrency: number = Math.max(1, Number(process.env.HERMES_CONCURRENCY) || 3),
  ) {}

  get configured(): boolean {
    return this.sessions.configured;
  }

  async trigger(event: RunStartedEvent, settings: WorkspaceSettings): Promise<AgentDispatch> {
    const message = runMessage(event, settings.agent.playbookVersion);
    const queue = [...event.operators];
    const failures: string[] = [];
    const worker = async () => {
      for (let op = queue.shift(); op; op = queue.shift()) {
        try {
          await this.sessions.send({ operatorId: op.id, kind: 'case', tmsOperatorId: op.tmsOperatorId, text: message }, op.name);
        } catch (error) {
          failures.push(`${op.id}: ${error instanceof Error ? error.message : String(error)}`);
          this.logger.warn(`Hermes session for ${op.id} failed: ${failures.at(-1)}`);
        }
      }
    };
    this.logger.log(`Dispatching run ${event.label} to ${queue.length} operator sessions (concurrency ${this.concurrency})`);
    const finished = Promise.all(Array.from({ length: this.concurrency }, worker)).then(
      () => `Hermes assessed ${event.operatorCount - failures.length} of ${event.operatorCount} operators in their own sessions.${failures.length ? ` Failed: ${failures.slice(0, 3).join('; ')}` : ''}`,
    );
    return { finished };
  }
}
