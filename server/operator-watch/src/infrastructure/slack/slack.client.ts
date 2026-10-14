export interface SlackMessage {
  readonly ts: string;
  readonly user?: string;
  readonly bot_id?: string;
  readonly text?: string;
  readonly subtype?: string;
}

/** The few Slack Web API calls the bot needs, over fetch with the bot token. */
export interface SlackApi {
  userInfo(userId: string): Promise<{ email: string | null; name: string }>;
  /** Thread messages (oldest first), or the latest messages of a direct-message channel when `threadTs` is absent. */
  history(channel: string, threadTs: string | undefined, limit: number): Promise<SlackMessage[]>;
  post(channel: string, text: string, threadTs?: string): Promise<string>;
  update(channel: string, ts: string, text: string): Promise<void>;
}

export class SlackWebApi implements SlackApi {
  constructor(
    private readonly token: string,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  private async call<T>(method: string, params: Record<string, unknown>, form = false): Promise<T> {
    const res = await this.fetchFn(`https://slack.com/api/${method}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${this.token}`, 'content-type': form ? 'application/x-www-form-urlencoded' : 'application/json; charset=utf-8' },
      body: form ? new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])) : JSON.stringify(params),
    });
    const body = (await res.json()) as { ok: boolean; error?: string } & T;
    if (!body.ok) throw new Error(`Slack ${method}: ${body.error ?? res.status}`);
    return body;
  }

  async userInfo(userId: string) {
    const { user } = await this.call<{ user: { real_name?: string; name?: string; profile?: { email?: string; display_name?: string } } }>('users.info', { user: userId }, true);
    return { email: user.profile?.email?.toLowerCase() ?? null, name: user.real_name || user.profile?.display_name || user.name || userId };
  }

  async history(channel: string, threadTs: string | undefined, limit: number) {
    if (threadTs) {
      const { messages } = await this.call<{ messages: SlackMessage[] }>('conversations.replies', { channel, ts: threadTs, limit }, true);
      return messages ?? [];
    }
    const { messages } = await this.call<{ messages: SlackMessage[] }>('conversations.history', { channel, limit }, true);
    return [...(messages ?? [])].reverse();
  }

  async post(channel: string, text: string, threadTs?: string) {
    const { ts } = await this.call<{ ts: string }>('chat.postMessage', { channel, text, thread_ts: threadTs, unfurl_links: false, unfurl_media: false });
    return ts;
  }

  async update(channel: string, ts: string, text: string) {
    await this.call('chat.update', { channel, ts, text });
  }
}
