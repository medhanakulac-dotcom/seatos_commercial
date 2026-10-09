import { Module } from '@nestjs/common';
import { SmtpConfig, loadSmtpConfig } from './smtp.config';
import { SmtpEmailSender } from './smtp.email-sender';

export const SMTP_CONFIG = Symbol('SMTP_CONFIG');

/**
 * Backend email delivery over SMTP (Hermes never sends). Connection details are env-only (SMTP_*, validated at boot);
 * the shared From identity and Reply-To come from admin settings. The workspace's send queue owns *when* and *whether*
 * to send; this module only knows *how* to put one approved message on the wire.
 */
@Module({
  providers: [
    { provide: SMTP_CONFIG, useFactory: (): SmtpConfig | null => loadSmtpConfig() },
    { provide: SmtpEmailSender, inject: [SMTP_CONFIG], useFactory: (config: SmtpConfig | null) => new SmtpEmailSender(config) },
  ],
  exports: [SmtpEmailSender],
})
export class EmailModule {}
