import { Logger } from '@nestjs/common';
import { AgentEvent, AgentNotifier } from '../../domain/workspace/types/repositories/workspace.ports';
import { HermesSessionClient } from './hermes-session.client';

const RECORD_ONLY = 'Record only — do not call tools or draft anything; reply with one short acknowledgement.';
const VERB = { approve: 'APPROVED', hold: 'PUT ON HOLD', reject: 'REJECTED', close: 'CLOSED', reopen: 'REOPENED' } as const;

export function renderHermesEvent(event: AgentEvent): string {
  if (event.type === 'email') {
    return `${RECORD_ONLY}\nEmail ${event.outcome === 'sent' ? 'SENT' : 'FAILED'}${event.caseRef ? ` (case ${event.caseRef})` : ''}: ${event.text}`;
  }
  const head = `Decision on case ${event.caseRef}: ${VERB[event.decision]} by ${event.actor}.${event.reason ? ` Reason: ${event.reason}` : ''}`;
  const edit = event.edit ? `\nAgent draft:\n${event.edit.agentBody}\nFinal approved by human:\n${event.edit.finalBody}` : '';
  return `${RECORD_ONLY}\n${head}${edit}`;
}

/**
 * Records decisions and email outcomes in the operator's Hermes session as record-only messages (never stored in the
 * chat log). Retries in-process with backoff; if the process dies mid-retry the note is lost (no durable outbox yet).
 */
export class HermesAgentNotifier implements AgentNotifier {
  private readonly logger = new Logger(HermesAgentNotifier.name);

  constructor(
    private readonly sessions: HermesSessionClient,
    private readonly attempts = 3,
    private readonly backoffMs = 2000,
  ) {}

  async notify(event: AgentEvent): Promise<void> {
    const envelope = { operatorId: event.operatorId, kind: event.type, text: renderHermesEvent(event) } as const;
    for (let attempt = 1; ; attempt++) {
      try {
        await this.sessions.send(envelope);
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (attempt >= this.attempts) {
          this.logger.warn(`Giving up telling Hermes about ${event.type} for ${event.operatorId} after ${attempt} attempts: ${message}`);
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, this.backoffMs * 2 ** (attempt - 1)));
      }
    }
  }
}
