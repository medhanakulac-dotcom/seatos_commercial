import { Logger } from '@nestjs/common';
import { ChatTurn } from '../../domain/workspace/types/repositories/workspace.ports';
import { background } from '../../infrastructure/runtime/background';
import { SlackApi, SlackMessage } from '../../infrastructure/slack/slack.client';
import { fitSlackMessage, questionText, toSlackMrkdwn } from '../../infrastructure/slack/slack.format';

/** What the bot needs from the workspace: answers a question for a named colleague. */
export interface SlackAnswerer {
  ask(input: { question: string; asker: string; history: readonly ChatTurn[] }): Promise<string>;
}

export interface SlackEventPayload {
  type?: string;
  challenge?: string;
  event_id?: string;
  authorizations?: { user_id?: string; is_bot?: boolean }[];
  event?: {
    type?: string;
    user?: string;
    text?: string;
    channel?: string;
    channel_type?: string;
    ts?: string;
    thread_ts?: string;
    bot_id?: string;
    subtype?: string;
  };
}

const SEEN_MAX = 500;
const HISTORY_MESSAGES = 12;
const PLACEHOLDER = '_Looking into it…_';
const NOT_ALLOWED = "Sorry, I can only answer colleagues who have access to the SeatOS commercial site. Ask an admin to add your email there, then try again.";
const FAILED = "Sorry, I couldn't answer that just now. Please try again in a minute.";

/**
 * The Slack bot: answers questions in DMs and when @mentioned, with the same assistant as the web chat. Only people whose Slack
 * email is on the site's allowed_users list get answers. Slack needs a reply within three seconds, so the work runs after the
 * response (on Vercel the function is kept alive until it finishes).
 */
export class SlackBotService {
  private readonly logger = new Logger(SlackBotService.name);
  private readonly seen = new Set<string>();

  constructor(
    private readonly slack: SlackApi,
    private readonly answerer: SlackAnswerer | null,
    private readonly isAllowed: (email: string) => Promise<boolean>,
  ) {}

  /** The immediate HTTP answer for an event payload; the real work continues in the background. */
  handle(payload: SlackEventPayload, retryNum?: string): { challenge: string } | { ok: true } {
    if (payload.type === 'url_verification' && typeof payload.challenge === 'string') return { challenge: payload.challenge };
    if (retryNum) return { ok: true }; // Slack resends when our answer was slow; the first delivery is already being worked on
    if (payload.type === 'event_callback' && payload.event) {
      const key = payload.event_id ?? `${payload.event.channel}:${payload.event.ts}`;
      if (!this.firstTime(key)) return { ok: true };
      background('Slack answer', this.answer(payload).catch((error) => this.logger.warn(`Slack answer failed: ${error instanceof Error ? error.message : String(error)}`)));
    }
    return { ok: true };
  }

  private firstTime(key: string): boolean {
    if (this.seen.has(key)) return false;
    if (this.seen.size >= SEEN_MAX) this.seen.delete(this.seen.values().next().value as string);
    this.seen.add(key);
    return true;
  }

  async answer(payload: SlackEventPayload): Promise<void> {
    const e = payload.event;
    if (!e?.channel || !e.user || !e.ts) return;
    if (e.bot_id || e.subtype) return; // the bot's own messages, edits, joins and the like
    const isDm = e.type === 'message' && e.channel_type === 'im';
    const isMention = e.type === 'app_mention';
    if (!isDm && !isMention) return;
    const botUserId = payload.authorizations?.find((a) => a.is_bot)?.user_id ?? payload.authorizations?.[0]?.user_id;
    const question = questionText(e.text ?? '', botUserId);
    if (!question) return;
    const threadTs = e.thread_ts ?? (isDm ? undefined : e.ts); // channel answers always go into a thread; DMs stay flat

    const asker = await this.slack.userInfo(e.user);
    if (!asker.email || !(await this.isAllowed(asker.email))) {
      this.logger.warn(`Slack user ${asker.email ?? e.user} is not on allowed_users`);
      await this.slack.post(e.channel, NOT_ALLOWED, threadTs);
      return;
    }
    if (!this.answerer) {
      await this.slack.post(e.channel, 'The assistant is not set up yet (the Claude key is missing on the server).', threadTs);
      return;
    }
    const placeholder = await this.slack.post(e.channel, PLACEHOLDER, threadTs);
    try {
      const history = await this.turns(e.channel, e.thread_ts, e.ts, botUserId);
      const reply = await this.answerer.ask({ question, asker: asker.name, history });
      await this.slack.update(e.channel, placeholder, fitSlackMessage(toSlackMrkdwn(reply) || FAILED));
    } catch (error) {
      this.logger.warn(`Assistant failed for ${asker.email}: ${error instanceof Error ? error.message : String(error)}`);
      await this.slack.update(e.channel, placeholder, FAILED);
    }
  }

  /** Earlier messages of the thread (or DM) as chat turns: the bot's lines are "assistant", everyone else "user"; the new question is left out. */
  private async turns(channel: string, threadTs: string | undefined, currentTs: string, botUserId: string | undefined): Promise<ChatTurn[]> {
    let messages: SlackMessage[] = [];
    try {
      messages = await this.slack.history(channel, threadTs, HISTORY_MESSAGES + 1);
    } catch (error) {
      this.logger.debug(`No history for ${channel}: ${error instanceof Error ? error.message : String(error)}`);
    }
    const turns: ChatTurn[] = [];
    for (const m of messages) {
      if (m.ts === currentTs || !m.text || m.text === PLACEHOLDER) continue;
      const role = m.bot_id || (botUserId && m.user === botUserId) ? 'assistant' : 'user';
      const text = role === 'user' ? questionText(m.text, botUserId) : m.text;
      if (!text) continue;
      const last = turns.at(-1);
      if (last?.role === role) turns[turns.length - 1] = { role, text: `${last.text}\n${text}` };
      else turns.push({ role, text });
    }
    return turns.slice(-HISTORY_MESSAGES);
  }
}
