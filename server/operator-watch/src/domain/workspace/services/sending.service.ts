import { Inject, Injectable, Logger, OnApplicationBootstrap, Optional } from '@nestjs/common';
import { SendChannel, SendJobRecord } from '../entities/workspace.entities';
import {
  AGENT_NOTIFIER,
  AgentNotifier,
  Clock,
  EMAIL_SENDERS,
  EmailReceipt,
  EmailSender,
  EmailSendError,
  WORKSPACE_CLOCK,
  WORKSPACE_STORE,
  WorkspaceStore,
} from '../types/repositories/workspace.ports';
import { enabledChannels } from './settings';
import { CHANNEL_NAMES, newEvent, newId, SettingsService } from './workspace.shared';

const MAX_ATTEMPTS = 5;
const BATCH = 20;
/** A send that has been "in flight" this long is presumed dead (SMTP timeouts are far shorter). */
const LEASE_MS = 10 * 60_000;

/** Production may email customers; any other environment needs SENDING_ALLOW_REAL_RECIPIENTS=true. */
export const realRecipientsAllowed = (env: NodeJS.ProcessEnv = process.env): boolean =>
  env.NODE_ENV === 'production' || env.SENDING_ALLOW_REAL_RECIPIENTS === 'true';

/** SEND_MAX_PER_MINUTE caps how many emails this instance hands to providers per minute (default 30; 0 = no cap). */
export const maxSendsPerMinute = (env: NodeJS.ProcessEnv = process.env): number => {
  const raw = env.SEND_MAX_PER_MINUTE;
  if (raw === undefined || raw === '') return 30;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) throw new Error('SEND_MAX_PER_MINUTE must be a non-negative integer');
  return n;
};

/**
 * Delivers approved emails. Sends exactly the text stored on the send job (the approved draft) —
 * no rendering, no model call. Nothing goes out while the admin master switch is off, and the
 * admin "redirect all" address, when set, replaces every recipient.
 *
 * Failure handling: a permanent failure (rejected recipient) fails the job at once; transient ones retry with
 * backoff. A job whose worker died mid-send is never resent automatically — the provider may already have accepted
 * it — it is marked failed as "delivery uncertain" so a person decides.
 */
@Injectable()
export class SendingService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SendingService.name);
  private readonly senders: Map<SendChannel, EmailSender>;
  private running = false;
  private readonly recentSends: number[] = [];

  constructor(
    @Inject(WORKSPACE_STORE) private readonly store: WorkspaceStore,
    @Inject(EMAIL_SENDERS) senders: EmailSender[],
    @Inject(WORKSPACE_CLOCK) private readonly clock: Clock,
    private readonly settings: SettingsService,
    @Optional() @Inject(AGENT_NOTIFIER) private readonly notifier?: AgentNotifier,
  ) {
    this.senders = new Map(senders.map((s) => [s.channel, s]));
  }

  /** In production, refuse to start with sending switched on for a channel the server cannot use. Elsewhere: warn. */
  async onApplicationBootstrap(): Promise<void> {
    const settings = await this.settings.get();
    if (!settings.sending.enabled) return;
    const missing = enabledChannels(settings).filter((c) => !this.senders.get(c)?.configured);
    if (!missing.length) return;
    const message = `Sending is enabled but ${missing.map((c) => CHANNEL_NAMES[c]).join(', ')} is enabled without server configuration (SMTP_HOST / HUBSPOT_ACCESS_TOKEN)`;
    if (process.env.NODE_ENV === 'production') throw new Error(message);
    this.logger.warn(message);
  }

  channelStatus(): Record<SendChannel, { configured: boolean; verification: { ok: boolean; error?: string; at: string } | null }> {
    const status = (c: SendChannel) => ({ configured: !!this.senders.get(c)?.configured, verification: this.senders.get(c)?.lastVerification ?? null });
    return { smtp: status('smtp'), hubspot: status('hubspot') };
  }

  /** Admin "verify connection": connects and authenticates without sending mail. */
  async verify(channel: SendChannel): Promise<{ ok: boolean; error?: string }> {
    const sender = this.senders.get(channel);
    if (!sender?.configured) return { ok: false, error: `${CHANNEL_NAMES[channel]} is not configured on the server` };
    if (!sender.verify) return { ok: false, error: `${CHANNEL_NAMES[channel]} cannot be verified without sending` };
    return sender.verify();
  }

  /** Worker tick: claims due jobs and sends them. Re-entrancy safe; returns how many were attempted. */
  async processDue(): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    try {
      const settings = await this.settings.get();
      if (!settings.sending.enabled) return 0;
      await this.failStale();
      const now = this.clock.now();
      const cap = maxSendsPerMinute();
      while (this.recentSends.length && this.recentSends[0] <= now.getTime() - 60_000) this.recentSends.shift();
      const room = cap === 0 ? BATCH : Math.min(BATCH, cap - this.recentSends.length);
      if (room <= 0) return 0;
      const jobs = await this.store.claimDueJobs(now.toISOString(), room);
      for (const job of jobs) {
        this.recentSends.push(this.clock.now().getTime());
        await this.deliver(job, settings);
      }
      return jobs.length;
    } finally {
      this.running = false;
    }
  }

  private async failStale(): Promise<void> {
    const cutoff = new Date(this.clock.now().getTime() - LEASE_MS).toISOString();
    const error = 'Delivery uncertain: the server stopped while sending, so the mail server may have accepted this email. Check the mailbox or provider before re-approving.';
    for (const job of await this.store.failStaleJobs(cutoff, error)) {
      this.logger.warn(`Send job ${job.id} was stuck in sending; marked failed (delivery uncertain)`);
      await this.event(job, 'bad', `Email to ${job.recipient} may or may not have been sent — the server stopped mid-send. Check before re-approving.`);
    }
  }

  private async deliver(job: SendJobRecord, settings: Awaited<ReturnType<SettingsService['get']>>): Promise<void> {
    const sender = this.senders.get(job.channel);
    const to = settings.sending.redirectAllTo || job.recipient;
    try {
      // Hard stop: outside production, real recipients are never emailed unless explicitly allowed.
      if (to === job.recipient && !realRecipientsAllowed()) {
        throw new Error('Real recipients are blocked outside production: set a test-mode redirect address in Settings (or SENDING_ALLOW_REAL_RECIPIENTS=true)');
      }
      if (!settings.sending[job.channel].enabled) throw new Error(`${CHANNEL_NAMES[job.channel]} is disabled in settings`);
      if (!sender?.configured) throw new Error(`${CHANNEL_NAMES[job.channel]} is not configured on the server`);
      const receipt = await sender.send(
        { jobId: job.id, to, subject: job.subject, body: job.body, originalRecipient: job.recipient, replyTo: settings.sending.replyTo || null },
        settings,
      );
      job.status = 'sent';
      job.sentAt = this.clock.now().toISOString();
      job.deliveredTo = to;
      job.providerMessageId = receipt.providerMessageId;
      job.providerResponse = receipt.response?.slice(0, 500) ?? null;
      job.error = null;
      await this.store.updateSendJob(job);
      await this.event(
        job,
        'ok',
        to !== job.recipient
          ? `Test mode: delivered to ${to} instead of ${job.recipient} — the client was not emailed`
          : `Email sent via ${CHANNEL_NAMES[job.channel]} to ${to}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const permanent = error instanceof EmailSendError && error.permanent;
      const giveUp = permanent || job.attempts >= MAX_ATTEMPTS;
      job.status = giveUp ? 'failed' : 'queued';
      job.error = message.slice(0, 1000);
      if (!giveUp) job.scheduledFor = new Date(this.clock.now().getTime() + 2 ** job.attempts * 60_000).toISOString();
      await this.store.updateSendJob(job);
      this.logger.warn(`Send job ${job.id} attempt ${job.attempts} failed${permanent ? ' (permanent)' : ''}: ${message}`);
      if (giveUp) {
        await this.event(
          job,
          'bad',
          permanent
            ? `Email could not be sent via ${CHANNEL_NAMES[job.channel]}: ${job.error}`
            : `Email could not be sent via ${CHANNEL_NAMES[job.channel]} after ${job.attempts} attempts: ${job.error}`,
        );
      }
    }
  }

  private async event(job: SendJobRecord, kind: 'ok' | 'bad', text: string): Promise<void> {
    const c = await this.store.getCase(job.caseId);
    if (!c) return;
    await this.store.insertEvent(newEvent({ operatorId: c.operatorId, caseId: c.id, kind, origin: 'system', at: this.clock.now().toISOString(), text }));
    // Best effort and not awaited: the agent's memory must never block or fail delivery.
    void this.notifier?.notify({ type: 'email', operatorId: c.operatorId, caseRef: c.caseRef, outcome: kind === 'ok' ? 'sent' : 'failed', text }).catch(() => undefined);
  }

  /** Admin "send test email": goes out immediately through the chosen channel, bypassing the queue. */
  async sendTest(channel: SendChannel, to: string): Promise<EmailReceipt> {
    const settings = await this.settings.get();
    const sender = this.senders.get(channel);
    if (!sender?.configured) throw new Error(`${CHANNEL_NAMES[channel]} is not configured on the server`);
    return sender.send(
      { jobId: `test-${newId()}`, to, subject: 'CS Tool test email', body: 'This is a test email from the Commercial Workspace settings page.', originalRecipient: to, replyTo: settings.sending.replyTo || null },
      settings,
    );
  }
}
