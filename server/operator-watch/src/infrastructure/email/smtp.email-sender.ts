import { Logger, OnApplicationBootstrap } from '@nestjs/common';
import { createTransport } from 'nodemailer';
import { WorkspaceSettings } from '../../domain/workspace/services/settings';
import { EmailReceipt, EmailSender, EmailSendError, OutgoingEmail } from '../../domain/workspace/types/repositories/workspace.ports';
import { domainOf, textToHtmlDocument } from './email.message';
import { SmtpConfig } from './smtp.config';

/** The slice of a nodemailer transport the sender uses, so tests can substitute a fake. */
export interface MailTransport {
  sendMail(message: Record<string, unknown>): Promise<{ messageId?: string; response?: string }>;
  verify(): Promise<unknown>;
}

export interface SmtpVerification {
  ok: boolean;
  error?: string;
  at: string;
}

interface SmtpErrorShape {
  code?: string;
  responseCode?: number;
  message?: string;
}

/** Replies that mean "fix the credentials/config", not "this message can never be delivered": keep retrying after the fix. */
const CONFIG_REPLY_CODES = new Set([530, 534, 535, 538]);

/**
 * 5xx replies (rejected recipient, mailbox full, policy) and malformed messages will not succeed on retry, so they fail
 * straight away. 4xx replies, network errors, timeouts and auth/config problems are transient and go through backoff.
 */
export function classifySmtpError(error: unknown): EmailSendError {
  if (error instanceof EmailSendError) return error;
  const e = (error ?? {}) as SmtpErrorShape;
  const rc = e.responseCode;
  const configProblem = e.code === 'EAUTH' || (rc !== undefined && CONFIG_REPLY_CODES.has(rc));
  const permanent = !configProblem && ((rc !== undefined && rc >= 500 && rc < 600) || e.code === 'EENVELOPE' || e.code === 'EMESSAGE');
  return new EmailSendError(e.message ?? String(error), permanent, rc ?? e.code);
}

/**
 * Sends approved emails over SMTP. The sender identity is one shared address (admin settings, falling back to
 * SMTP_FROM_ADDRESS); each message gets a Message-ID derived from its job id, so a retry of the same job is
 * recognisably the same message to the receiving server.
 */
export class SmtpEmailSender implements EmailSender, OnApplicationBootstrap {
  readonly channel = 'smtp' as const;
  private readonly logger = new Logger(SmtpEmailSender.name);
  private readonly transport: MailTransport | null;
  private last: SmtpVerification | null = null;

  constructor(private readonly config: SmtpConfig | null, transport?: MailTransport) {
    this.transport =
      transport ??
      (config
        ? createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            requireTLS: config.requireTLS,
            connectionTimeout: config.connectionTimeoutMs,
            greetingTimeout: config.greetingTimeoutMs,
            socketTimeout: config.socketTimeoutMs,
            auth: config.user ? { user: config.user, pass: config.password } : undefined,
          })
        : null);
  }

  get configured(): boolean {
    return !!this.transport;
  }

  /** Result of the most recent verify() (boot or admin button); null until one has run. */
  get lastVerification(): SmtpVerification | null {
    return this.last;
  }

  /** Non-blocking: a slow or unreachable mail server must not hold up startup. The outcome is logged and shown to admins. */
  onApplicationBootstrap(): void {
    if (this.transport) void this.verify();
  }

  async verify(): Promise<{ ok: boolean; error?: string }> {
    if (!this.transport) return { ok: false, error: 'SMTP is not configured (SMTP_HOST)' };
    try {
      await this.transport.verify();
      this.last = { ok: true, at: new Date().toISOString() };
      this.logger.log(`SMTP connection verified (${this.config?.host ?? 'custom transport'})`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.last = { ok: false, error: message, at: new Date().toISOString() };
      this.logger.warn(`SMTP verification failed: ${message}`);
    }
    return this.last.ok ? { ok: true } : { ok: false, error: this.last.error };
  }

  async send(email: OutgoingEmail, settings: WorkspaceSettings): Promise<EmailReceipt> {
    if (!this.transport) throw new EmailSendError('SMTP is not configured (SMTP_HOST)', false);
    const fromAddress = settings.sending.smtp.fromAddress || this.config?.fromAddress;
    if (!fromAddress) throw new EmailSendError('Set a From address for SMTP in settings (or SMTP_FROM_ADDRESS)', false);
    const fromName = settings.sending.smtp.fromName || this.config?.fromName;
    try {
      const info = await this.transport.sendMail({
        from: fromName ? { name: fromName, address: fromAddress } : fromAddress,
        to: email.to,
        replyTo: email.replyTo || undefined,
        subject: email.subject,
        text: email.body,
        html: textToHtmlDocument(email.body, email.subject),
        messageId: `<${email.jobId}@${domainOf(fromAddress)}>`,
        headers: { 'X-CS-Send-Job': email.jobId, ...(email.to !== email.originalRecipient ? { 'X-Original-Recipient': email.originalRecipient } : {}) },
      });
      return { providerMessageId: info.messageId ?? null, response: info.response ?? null };
    } catch (error) {
      throw classifySmtpError(error);
    }
  }
}
