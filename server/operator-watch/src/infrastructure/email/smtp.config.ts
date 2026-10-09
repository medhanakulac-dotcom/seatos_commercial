import { z } from 'zod';

export interface SmtpConfig {
  host: string;
  port: number;
  /** Implicit TLS from the first byte (usually port 465). Otherwise the connection starts plain and upgrades via STARTTLS. */
  secure: boolean;
  /** Refuse to send unless the connection is encrypted (STARTTLS must succeed). Defaults to on in production. */
  requireTLS: boolean;
  connectionTimeoutMs: number;
  greetingTimeoutMs: number;
  socketTimeoutMs: number;
  user?: string;
  password?: string;
  /** Fallback From identity when the admin settings leave it blank. */
  fromAddress?: string;
  fromName?: string;
}

/** `KEY=` in an env file means unset, so an empty string is treated as absent. */
const bool = (name: string) =>
  z
    .preprocess((v) => (v === '' ? undefined : v), z.enum(['true', 'false'], { errorMap: () => ({ message: `${name} must be "true" or "false"` }) }).optional())
    .transform((v) => (v === undefined ? undefined : v === 'true'));
const millis = (name: string, fallback: number) =>
  z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (v === undefined || v === '') return fallback;
      const n = Number(v);
      if (!Number.isSafeInteger(n) || n < 1000) {
        ctx.addIssue({ code: 'custom', message: `${name} must be a number of milliseconds (at least 1000)` });
        return z.NEVER;
      }
      return n;
    });

const schema = z.object({
  SMTP_HOST: z.string().trim().min(1),
  SMTP_PORT: z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (v === undefined || v === '') return 587;
      const n = Number(v);
      if (!Number.isInteger(n) || n < 1 || n > 65535) {
        ctx.addIssue({ code: 'custom', message: 'SMTP_PORT must be a port number (1-65535)' });
        return z.NEVER;
      }
      return n;
    }),
  SMTP_SECURE: bool('SMTP_SECURE'),
  SMTP_REQUIRE_TLS: bool('SMTP_REQUIRE_TLS'),
  SMTP_CONNECTION_TIMEOUT_MS: millis('SMTP_CONNECTION_TIMEOUT_MS', 10_000),
  SMTP_GREETING_TIMEOUT_MS: millis('SMTP_GREETING_TIMEOUT_MS', 10_000),
  SMTP_SOCKET_TIMEOUT_MS: millis('SMTP_SOCKET_TIMEOUT_MS', 30_000),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM_ADDRESS: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(v), 'SMTP_FROM_ADDRESS must be an email address'),
  SMTP_FROM_NAME: z.string().trim().max(100).optional(),
});

/**
 * SMTP connection details come from env and are validated once at boot (an invalid value stops the app with a clear
 * message). Returns null when SMTP_HOST is unset, meaning the SMTP channel is simply not configured.
 */
export function loadSmtpConfig(env: NodeJS.ProcessEnv = process.env): SmtpConfig | null {
  if (!env.SMTP_HOST?.trim()) return null;
  const parsed = schema.safeParse(env);
  if (!parsed.success) throw new Error(`Invalid SMTP configuration: ${parsed.error.issues.map((i) => i.message).join('; ')}`);
  const v = parsed.data;
  const user = v.SMTP_USER || undefined;
  const password = v.SMTP_PASSWORD || undefined;
  if (!!user !== !!password) throw new Error('Invalid SMTP configuration: SMTP_USER and SMTP_PASSWORD must be set together');
  return {
    host: v.SMTP_HOST,
    port: v.SMTP_PORT,
    secure: v.SMTP_SECURE ?? v.SMTP_PORT === 465,
    requireTLS: v.SMTP_REQUIRE_TLS ?? env.NODE_ENV === 'production',
    connectionTimeoutMs: v.SMTP_CONNECTION_TIMEOUT_MS,
    greetingTimeoutMs: v.SMTP_GREETING_TIMEOUT_MS,
    socketTimeoutMs: v.SMTP_SOCKET_TIMEOUT_MS,
    user,
    password,
    fromAddress: v.SMTP_FROM_ADDRESS || undefined,
    fromName: v.SMTP_FROM_NAME || undefined,
  };
}
