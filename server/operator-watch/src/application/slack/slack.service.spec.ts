import { createHmac } from 'node:crypto';
import { SlackApi, SlackMessage } from '../../infrastructure/slack/slack.client';
import { fitSlackMessage, questionText, tablesToLists, toSlackMrkdwn, verifySlackSignature } from '../../infrastructure/slack/slack.format';
import { SlackBotService, SlackEventPayload } from './slack.service';

class FakeSlack implements SlackApi {
  posts: { channel: string; text: string; threadTs?: string }[] = [];
  updates: { ts: string; text: string }[] = [];
  thread: SlackMessage[] = [];
  async userInfo(userId: string) {
    return userId === 'U_OK' ? { email: 'ann@seatos.com', name: 'Ann' } : { email: 'x@outside.com', name: 'Xavier' };
  }
  async history() {
    return this.thread;
  }
  async post(channel: string, text: string, threadTs?: string) {
    this.posts.push({ channel, text, threadTs });
    return `reply-${this.posts.length}`;
  }
  async update(_channel: string, ts: string, text: string) {
    this.updates.push({ ts, text });
  }
}

const mention = (user: string, text: string, extra: Partial<NonNullable<SlackEventPayload['event']>> = {}): SlackEventPayload => ({
  type: 'event_callback',
  event_id: `ev-${Math.random()}`,
  authorizations: [{ user_id: 'UBOT', is_bot: true }],
  event: { type: 'app_mention', user, text, channel: 'C1', ts: '100.1', ...extra },
});

describe('Slack signature and text', () => {
  const secret = 's3cret';
  const body = '{"type":"event_callback"}';
  const sign = (ts: number) => `v0=${createHmac('sha256', secret).update(`v0:${ts}:${body}`).digest('hex')}`;

  it('accepts a good signature and refuses wrong, missing or stale ones', () => {
    const now = 1_800_000_000;
    expect(verifySlackSignature(secret, body, String(now), sign(now), now)).toBe(true);
    expect(verifySlackSignature(secret, body + ' ', String(now), sign(now), now)).toBe(false);
    expect(verifySlackSignature('other', body, String(now), sign(now), now)).toBe(false);
    expect(verifySlackSignature(secret, body, undefined, sign(now), now)).toBe(false);
    expect(verifySlackSignature(secret, body, String(now - 600), sign(now - 600), now)).toBe(false);
  });

  it('turns a Markdown table into one readable line per row', () => {
    const table = 'Recent weeks\n| Week | WAO | Features in use | Confirmed bookings |\n|---|---|---|---|\n| 12 Oct (partial) | **4/7** | reservation, trip | 207 |\n| 5 Oct | 2/7 | reservation | 592 |\nDone.';
    expect(tablesToLists(table)).toBe('Recent weeks\n• *12 Oct (partial)* — WAO: **4/7** · Features in use: reservation, trip · Confirmed bookings: 207\n• *5 Oct* — WAO: 2/7 · Features in use: reservation · Confirmed bookings: 592\nDone.');
    expect(toSlackMrkdwn(table)).not.toContain('|---');
    expect(toSlackMrkdwn(table)).toContain('WAO: *4/7*');
    expect(tablesToLists('a | b\nplain text')).toBe('a | b\nplain text');
  });

  it('strips the bot mention and turns Markdown into Slack formatting', () => {
    expect(questionText('<@UBOT> how is *Than Car* doing?', 'UBOT')).toBe('how is *Than Car* doing?');
    expect(toSlackMrkdwn('## Summary\n**WAO 5/7**\n- [site](https://a.b)')).toBe('*Summary*\n*WAO 5/7*\n• <https://a.b|site>');
    expect(fitSlackMessage('x'.repeat(40), 10)).toMatch(/shortened/);
  });
});

describe('SlackBotService', () => {
  const build = (answer: (q: string) => Promise<string> = async () => '**Answer**') => {
    const slack = new FakeSlack();
    const asked: { question: string; asker: string; history: unknown }[] = [];
    const bot = new SlackBotService(
      slack,
      { ask: async (i) => (asked.push(i), answer(i.question)) },
      async (email) => email.endsWith('@seatos.com'),
    );
    return { slack, asked, bot };
  };

  it('answers the challenge and ignores Slack retries', () => {
    const { bot, asked } = build();
    expect(bot.handle({ type: 'url_verification', challenge: 'abc' })).toEqual({ challenge: 'abc' });
    expect(bot.handle(mention('U_OK', '<@UBOT> hi'), '1')).toEqual({ ok: true });
    expect(asked).toHaveLength(0);
  });

  it('answers an allowed colleague in a thread: placeholder first, then the answer in Slack formatting', async () => {
    const { bot, slack, asked } = build();
    await bot.answer(mention('U_OK', '<@UBOT> how is Than Car doing?'));
    expect(asked[0]).toMatchObject({ question: 'how is Than Car doing?', asker: 'Ann' });
    expect(slack.posts).toEqual([{ channel: 'C1', text: '_Looking into it…_', threadTs: '100.1' }]);
    expect(slack.updates).toEqual([{ ts: 'reply-1', text: '*Answer*' }]);
  });

  it('refuses people who are not on the allowed list, without calling the assistant', async () => {
    const { bot, slack, asked } = build();
    await bot.answer(mention('U_OUT', '<@UBOT> top operators?'));
    expect(asked).toHaveLength(0);
    expect(slack.posts[0].text).toMatch(/access to the SeatOS commercial site/);
  });

  it('ignores bots, edits and other event types, and answers a DM flat (no thread)', async () => {
    const { bot, slack, asked } = build();
    await bot.answer(mention('U_OK', 'hi', { bot_id: 'B1' }));
    await bot.answer(mention('U_OK', 'hi', { subtype: 'message_changed' }));
    await bot.answer({ ...mention('U_OK', 'hi'), event: { type: 'message', channel_type: 'channel', user: 'U_OK', text: 'hi', channel: 'C1', ts: '1.1' } });
    expect(asked).toHaveLength(0);
    await bot.answer({ ...mention('U_OK', 'ranking?'), event: { type: 'message', channel_type: 'im', user: 'U_OK', text: 'ranking?', channel: 'D1', ts: '5.5' } });
    expect(asked).toHaveLength(1);
    expect(slack.posts[0].threadTs).toBeUndefined();
  });

  it('gives the assistant the earlier thread as history (bot lines are assistant turns)', async () => {
    const { bot, slack, asked } = build();
    slack.thread = [
      { ts: '90.1', user: 'U_OK', text: '<@UBOT> who is Than Car?' },
      { ts: '90.2', bot_id: 'B1', text: 'A bus operator.' },
      { ts: '100.1', user: 'U_OK', text: '<@UBOT> and tickets?' },
    ];
    await bot.answer(mention('U_OK', '<@UBOT> and tickets?', { thread_ts: '90.1' }));
    expect(asked[0].history).toEqual([
      { role: 'user', text: 'who is Than Car?' },
      { role: 'assistant', text: 'A bus operator.' },
    ]);
  });

  it('says so when the assistant fails', async () => {
    const { bot, slack } = build(async () => {
      throw new Error('boom');
    });
    await bot.answer(mention('U_OK', '<@UBOT> hi there'));
    expect(slack.updates[0].text).toMatch(/couldn't answer/);
  });
});
