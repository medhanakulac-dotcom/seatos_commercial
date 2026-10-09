import { loadSmtpConfig } from './smtp.config';

describe('loadSmtpConfig', () => {
  it('is null when SMTP_HOST is unset', () => {
    expect(loadSmtpConfig({})).toBeNull();
    expect(loadSmtpConfig({ SMTP_HOST: '  ' })).toBeNull();
  });

  it('applies defaults: STARTTLS port 587, timeouts, TLS not required outside production', () => {
    expect(loadSmtpConfig({ SMTP_HOST: 'smtp.example.com' })).toEqual({
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      requireTLS: false,
      connectionTimeoutMs: 10_000,
      greetingTimeoutMs: 10_000,
      socketTimeoutMs: 30_000,
      user: undefined,
      password: undefined,
      fromAddress: undefined,
      fromName: undefined,
    });
  });

  it('uses implicit TLS on 465 and requires TLS by default in production', () => {
    expect(loadSmtpConfig({ SMTP_HOST: 'h', SMTP_PORT: '465' })).toMatchObject({ port: 465, secure: true });
    expect(loadSmtpConfig({ SMTP_HOST: 'h', NODE_ENV: 'production' })).toMatchObject({ requireTLS: true });
    expect(loadSmtpConfig({ SMTP_HOST: 'h', NODE_ENV: 'production', SMTP_REQUIRE_TLS: 'false' })).toMatchObject({ requireTLS: false });
  });

  it('treats empty env values (KEY=) as unset', () => {
    expect(loadSmtpConfig({ SMTP_HOST: 'h', SMTP_PORT: '', SMTP_SECURE: '', SMTP_REQUIRE_TLS: '', SMTP_USER: '', SMTP_PASSWORD: '', SMTP_FROM_ADDRESS: '' })).toMatchObject({
      port: 587,
      secure: false,
      requireTLS: false,
      user: undefined,
      fromAddress: undefined,
    });
  });

  it('reads credentials and the default From identity', () => {
    expect(loadSmtpConfig({ SMTP_HOST: 'h', SMTP_USER: 'u', SMTP_PASSWORD: 'p', SMTP_FROM_ADDRESS: 'cs@seatos.com', SMTP_FROM_NAME: 'SeatOS CS' })).toMatchObject({
      user: 'u',
      password: 'p',
      fromAddress: 'cs@seatos.com',
      fromName: 'SeatOS CS',
    });
  });

  it.each([
    [{ SMTP_PORT: 'abc' }, 'SMTP_PORT'],
    [{ SMTP_PORT: '70000' }, 'SMTP_PORT'],
    [{ SMTP_SECURE: 'yes' }, 'SMTP_SECURE'],
    [{ SMTP_SOCKET_TIMEOUT_MS: '5' }, 'SMTP_SOCKET_TIMEOUT_MS'],
    [{ SMTP_FROM_ADDRESS: 'not-an-email' }, 'SMTP_FROM_ADDRESS'],
    [{ SMTP_USER: 'u' }, 'SMTP_USER and SMTP_PASSWORD'],
    [{ SMTP_PASSWORD: 'p' }, 'SMTP_USER and SMTP_PASSWORD'],
  ])('rejects %j', (extra, message) => {
    expect(() => loadSmtpConfig({ SMTP_HOST: 'h', ...extra })).toThrow(message);
  });
});
