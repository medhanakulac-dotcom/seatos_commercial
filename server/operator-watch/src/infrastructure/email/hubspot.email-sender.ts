import { Logger } from '@nestjs/common';
import { WorkspaceSettings } from '../../domain/workspace/services/settings';
import { EmailReceipt, EmailSender, OutgoingEmail } from '../../domain/workspace/types/repositories/workspace.ports';
import { HubSpotClient } from '../hubspot/hubspot.client';
import { textToHtml } from './email.message';

/**
 * HubSpot transactional single-send. Needs the Transactional Email add-on, the `transactional-email`
 * scope, and a transactional email in HubSpot (its ID in settings) whose template renders
 * {{ custom.subject }} and {{ custom.body }}. `sendId` makes retries idempotent on HubSpot's side.
 * The shared From address and Reply-To are configured on the HubSpot transactional email itself.
 */
export class HubSpotEmailSender implements EmailSender {
  readonly channel = 'hubspot' as const;
  private readonly logger = new Logger(HubSpotEmailSender.name);

  constructor(private readonly client: HubSpotClient | null) {}

  get configured(): boolean {
    return !!this.client;
  }

  async send(email: OutgoingEmail, settings: WorkspaceSettings): Promise<EmailReceipt> {
    if (!this.client) throw new Error('HubSpot is not configured (HUBSPOT_ACCESS_TOKEN)');
    const emailId = Number(settings.sending.hubspot.emailId);
    if (!emailId) throw new Error('Set the HubSpot transactional email ID in settings');
    const res = await this.client.post<{ statusId?: string; status?: string }>('/marketing/v3/transactional/single-email/send', {
      emailId,
      message: { to: email.to, sendId: email.jobId },
      customProperties: { subject: email.subject, body: textToHtml(email.body) },
    });
    this.logger.log(`HubSpot accepted send ${email.jobId} (${res.status ?? 'unknown'})`);
    return { providerMessageId: res.statusId ?? null, response: res.status ?? null };
  }
}
