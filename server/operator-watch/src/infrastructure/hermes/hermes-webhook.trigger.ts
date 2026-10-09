import { createHmac } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { WorkspaceSettings } from '../../domain/workspace/services/settings';
import { AgentTrigger, RunStartedEvent } from '../../domain/workspace/types/repositories/workspace.ports';

export const RUN_STARTED_EVENT = 'operator_watch.run_started';

/** GitHub-style signature Hermes' webhook adapter validates: `sha256=<hex HMAC of the raw body>`. */
export const signBody = (secret: string, body: string): string => `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;

type FetchFn = (url: string, init: { method: string; headers: Record<string, string>; body: string; signal: AbortSignal }) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

/**
 * Wakes Hermes for a new run by POSTing to its webhook route (e.g. http://hermes:8644/webhooks/operator-watch),
 * signed with HERMES_WEBHOOK_SECRET. Hermes then works through the backend's MCP tools.
 */
@Injectable()
export class HermesWebhookTrigger implements AgentTrigger {
  private readonly logger = new Logger(HermesWebhookTrigger.name);

  constructor(
    private readonly secret: string | undefined = process.env.HERMES_WEBHOOK_SECRET,
    private readonly fetchFn: FetchFn = fetch,
  ) {}

  get configured(): boolean {
    return !!this.secret;
  }

  async trigger(event: RunStartedEvent, settings: WorkspaceSettings): Promise<void> {
    const url = settings.agent.webhookUrl;
    if (!url) throw new Error('Hermes webhook URL is not set in settings');
    if (!this.secret) throw new Error('HERMES_WEBHOOK_SECRET is not set on the server');
    const body = JSON.stringify({
      event_type: RUN_STARTED_EVENT,
      run_id: event.runId,
      label: event.label,
      snapshot_id: event.snapshotId,
      operator_count: event.operatorCount,
      trigger: event.trigger,
      playbook_version: settings.agent.playbookVersion || null,
      instructions:
        'Operator Watch run started. Use the commercial-workspace MCP tools: list_operators(run_id), get_operator for detail, ' +
        'submit_case once per operator (needs_outreach + analysis, and a draft when outreach is needed), then complete_run.',
    });
    const res = await this.fetchFn(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-hub-signature-256': signBody(this.secret, body), 'x-github-event': RUN_STARTED_EVENT, 'x-github-delivery': event.runId },
      body,
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`Hermes webhook returned ${res.status}: ${(await res.text()).slice(0, 200)}`);
    this.logger.log(`Hermes notified of run ${event.label}`);
  }
}
