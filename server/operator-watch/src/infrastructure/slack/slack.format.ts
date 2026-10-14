import { createHmac, timingSafeEqual } from 'node:crypto';

const MAX_AGE_SECONDS = 5 * 60;

/**
 * Slack signs every request: `v0=` + HMAC-SHA256 of `v0:<timestamp>:<raw body>` with the app's signing secret.
 * Rejects stale timestamps (replays) and wrong signatures.
 */
export function verifySlackSignature(secret: string, rawBody: string, timestamp: string | undefined, signature: string | undefined, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
  if (!secret || !timestamp || !signature) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowSeconds - ts) > MAX_AGE_SECONDS) return false;
  const expected = `v0=${createHmac('sha256', secret).update(`v0:${timestamp}:${rawBody}`).digest('hex')}`;
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** The question without the bot's own @mention (`<@U123>`), trimmed. Other people's mentions stay as plain text. */
export function questionText(text: string, botUserId?: string): string {
  const withoutBot = botUserId ? text.replaceAll(`<@${botUserId}>`, '') : text.replace(/^\s*<@[A-Z0-9]+>/, '');
  return withoutBot.replace(/<@([A-Z0-9]+)>/g, '@$1').replace(/<(https?:[^|>]+)\|([^>]+)>/g, '$2 ($1)').replace(/<(https?:[^>]+)>/g, '$1').trim();
}

const isTableRow = (line: string) => /^\s*\|.*\|\s*$/.test(line);
const isSeparator = (line: string) => /^\s*\|[\s:|-]+\|\s*$/.test(line) && line.includes('-');
const cells = (line: string) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

/**
 * Slack cannot draw tables, so a Markdown table becomes one line per row: the first column in bold, then "Header: value"
 * pairs ("*12 Oct* — WAO: 4/7 · Bookings: 207"). Text around the table is left alone.
 */
export function tablesToLists(markdown: string): string {
  const lines = markdown.split('\n');
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (isTableRow(lines[i]) && lines[i + 1] && isSeparator(lines[i + 1])) {
      const header = cells(lines[i]);
      i += 2;
      for (; i < lines.length && isTableRow(lines[i]); i++) {
        const row = cells(lines[i]);
        const rest = row.slice(1).map((v, k) => (v ? `${header[k + 1] ? `${header[k + 1]}: ` : ''}${v}` : '')).filter(Boolean);
        out.push(`• *${row[0].replace(/\*/g, '')}*${rest.length ? ` — ${rest.join(' · ')}` : ''}`);
      }
      i--;
    } else out.push(lines[i]);
  }
  return out.join('\n');
}

/** Markdown from the model → Slack mrkdwn: **bold** → *bold*, [text](url) → <url|text>, # headings → bold lines. */
export function toSlackMrkdwn(markdown: string): string {
  return tablesToLists(markdown.replace(/\r\n/g, '\n'))
    .replace(/^#{1,6}\s+(.+)$/gm, '*$1*')
    .replace(/\*\*(.+?)\*\*/g, '*$1*')
    .replace(/__(.+?)__/g, '*$1*')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<$2|$1>')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .trim();
}

/** Slack accepts about 40,000 characters in a message; stay well under and say when text was cut. */
export function fitSlackMessage(text: string, max = 35_000): string {
  return text.length <= max ? text : `${text.slice(0, max)}\n… (shortened)`;
}
