import { DEFAULT_SETTINGS, WorkspaceSettings } from '../../domain/workspace/services/settings';
import { EmailSendError } from '../../domain/workspace/types/repositories/workspace.ports';
import { textToHtml, textToHtmlDocument } from './email.message';
import { SmtpConfig } from './smtp.config';
import { classifySmtpError, MailTransport, SmtpEmailSender } from './smtp.email-sender';

const settings = (smtp: Partial<WorkspaceSettings['sending']['smtp']> = {}): WorkspaceSettings => ({
  ...DEFAULT_SETTINGS,
  sending: { ...DEFAULT_SETTINGS.sending, smtp: { enabled: true, fromName: 'SeatOS CS', fromAddress: 'cs@seatos.com', ...smtp } },
});
const email = { jobId: 'job-1', to: 'ops@operator.example', subject: 'Hello <team>', body: 'Hi & welcome\nSecond line', originalRecipient: 'ops@operator.example' };

class FakeTransport implements MailTransport {
  readonly sent: Record<string, unknown>[] = [];
  sendError: unknown = null;
  verifyError: unknown = null;
  async sendMail(message: Record<string, unknown>) {
    if (this.sendError) throw this.sendError;
    this.sent.push(message);
    return { messageId: message.messageId as string, response: '250 2.0.0 OK queued' };
  }
  async verify() {
    if (this.verifyError) throw this.verifyError;
    return true;
  }
}
const smtpError = (message: string, extra: { code?: string; responseCode?: number }) => Object.assign(new Error(message), extra);

describe('SmtpEmailSender', () => {
  it('builds a multipart message from the shared From address with a job-derived Message-ID', async () => {
    const transport = new FakeTransport();
    const receipt = await new SmtpEmailSender(null, transport).send({ ...email, replyTo: 'replies@seatos.com' }, settings());
    expect(transport.sent[0]).toMatchObject({
      from: { name: 'SeatOS CS', address: 'cs@seatos.com' },
      to: 'ops@operator.example',
      replyTo: 'replies@seatos.com',
      subject: 'Hello <team>',
      text: 'Hi & welcome\nSecond line',
      messageId: '<job-1@seatos.com>',
      headers: { 'X-CS-Send-Job': 'job-1' },
    });
    expect(transport.sent[0].html).toContain('Hi &amp; welcome<br>Second line');
    expect(transport.sent[0].html).toContain('<title>Hello &lt;team&gt;</title>');
    expect(receipt).toEqual({ providerMessageId: '<job-1@seatos.com>', response: '250 2.0.0 OK queued' });
  });

  it('records the original recipient only when the message was redirected', async () => {
    const transport = new FakeTransport();
    const sender = new SmtpEmailSender(null, transport);
    await sender.send({ ...email, to: 'qa@seatos.com' }, settings());
    await sender.send(email, settings());
    expect(transport.sent[0].headers).toMatchObject({ 'X-Original-Recipient': 'ops@operator.example' });
    expect(transport.sent[1].headers).not.toHaveProperty('X-Original-Recipient');
    expect(transport.sent[1]).toMatchObject({ replyTo: undefined });
  });

  it('falls back to the SMTP_FROM_* defaults when settings leave the identity blank', async () => {
    const transport = new FakeTransport();
    const config = { fromAddress: 'noreply@seatos.com', fromName: 'SeatOS' } as SmtpConfig;
    await new SmtpEmailSender(config, transport).send(email, settings({ fromAddress: '', fromName: '' }));
    expect(transport.sent[0]).toMatchObject({ from: { name: 'SeatOS', address: 'noreply@seatos.com' }, messageId: '<job-1@seatos.com>' });
  });

  it('refuses to send without a From address or without SMTP configured', async () => {
    await expect(new SmtpEmailSender(null, new FakeTransport()).send(email, settings({ fromAddress: '' }))).rejects.toThrow('From address');
    const unconfigured = new SmtpEmailSender(null);
    expect(unconfigured.configured).toBe(false);
    await expect(unconfigured.send(email, settings())).rejects.toThrow('not configured');
    expect(await unconfigured.verify()).toEqual({ ok: false, error: 'SMTP is not configured (SMTP_HOST)' });
  });

  it('classifies transport errors as permanent or transient', async () => {
    const transport = new FakeTransport();
    const sender = new SmtpEmailSender(null, transport);
    transport.sendError = smtpError('550 5.1.1 No such user', { responseCode: 550 });
    await expect(sender.send(email, settings())).rejects.toMatchObject({ name: 'EmailSendError', permanent: true, code: 550 });
    transport.sendError = smtpError('451 4.3.0 try later', { responseCode: 451 });
    await expect(sender.send(email, settings())).rejects.toMatchObject({ permanent: false });
    transport.sendError = smtpError('connect ETIMEDOUT', { code: 'ETIMEDOUT' });
    await expect(sender.send(email, settings())).rejects.toMatchObject({ permanent: false, code: 'ETIMEDOUT' });
  });

  it('remembers the last verification result', async () => {
    const transport = new FakeTransport();
    const sender = new SmtpEmailSender(null, transport);
    expect(sender.lastVerification).toBeNull();
    expect(await sender.verify()).toEqual({ ok: true });
    expect(sender.lastVerification).toMatchObject({ ok: true });
    transport.verifyError = smtpError('Invalid login', { code: 'EAUTH', responseCode: 535 });
    expect(await sender.verify()).toEqual({ ok: false, error: 'Invalid login' });
    expect(sender.lastVerification).toMatchObject({ ok: false, error: 'Invalid login' });
  });
});

describe('classifySmtpError', () => {
  it.each([
    [{ responseCode: 552 }, true],
    [{ responseCode: 554 }, true],
    [{ code: 'EENVELOPE' }, true],
    [{ code: 'EMESSAGE' }, true],
    [{ responseCode: 421 }, false],
    [{ responseCode: 450 }, false],
    [{ code: 'ECONNREFUSED' }, false],
    [{ code: 'EAUTH', responseCode: 535 }, false],
    [{ responseCode: 530 }, false],
    [{}, false],
  ])('%j → permanent=%s', (e, permanent) => {
    expect(classifySmtpError(Object.assign(new Error('x'), e)).permanent).toBe(permanent);
  });

  it('passes through errors that are already classified and wraps non-errors', () => {
    const already = new EmailSendError('nope', true);
    expect(classifySmtpError(already)).toBe(already);
    expect(classifySmtpError('boom')).toMatchObject({ message: 'boom', permanent: false });
  });
});

describe('message rendering', () => {
  it('escapes text and keeps line breaks', () => {
    expect(textToHtml('a <b> & "c"\r\nd')).toContain('a &lt;b&gt; &amp; &quot;c&quot;<br>d');
    expect(textToHtmlDocument('hi', 'S')).toMatch(/^<!doctype html>.*<body[^>]*>.*hi.*<\/body><\/html>$/);
  });
});
