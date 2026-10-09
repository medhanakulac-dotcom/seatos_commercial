import { AgentEnvelope } from '../../domain/workspace/types/repositories/workspace.ports';
import { formatHermesMessage } from './hermes-envelope';
import { DefaultOperatorChatPolicy, OperatorChatPolicy } from './operator-chat/operator-chat.policy';


type FetchFn = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string; signal: AbortSignal },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown>; text(): Promise<string> }>;

/** One Hermes session per operator, so chat, run analysis and follow-ups all share the same memory. */
export const operatorSessionId = (operatorId: string): string => `opw-${operatorId}`;

const CHAT_TIMEOUT_MS = 10 * 60_000;

/** Talks to the Hermes API server (`POST /api/sessions/{id}/chat`). Configured by HERMES_API_URL + HERMES_API_KEY. */
export class HermesSessionClient {
  private readonly known = new Set<string>();
  /** Tail of the send chain per session: messages to one session run strictly one after another. */
  private readonly queues = new Map<string, Promise<unknown>>();

  constructor(
    private readonly baseUrl: string | undefined = process.env.HERMES_API_URL,
    private readonly apiKey: string | undefined = process.env.HERMES_API_KEY,
    private readonly fetchFn: FetchFn = fetch,
    private readonly policy: Pick<OperatorChatPolicy, 'systemPrompt'> = new DefaultOperatorChatPolicy(),
  ) {}

  get configured(): boolean {
    return !!this.baseUrl && !!this.apiKey;
  }

  /**
   * Sends one envelope into the operator's session (created on first use) and returns the agent's reply. Sends to the
   * same session are serialized, so a decision note never interleaves with an in-flight chat turn.
   */
  send(envelope: AgentEnvelope, operatorName: string = envelope.operatorId): Promise<string> {
    const sessionId = operatorSessionId(envelope.operatorId);
    const run = (this.queues.get(sessionId) ?? Promise.resolve()).catch(() => undefined).then(() => this.deliver(envelope, operatorName));
    this.queues.set(sessionId, run);
    const clear = () => this.queues.get(sessionId) === run && this.queues.delete(sessionId);
    run.then(clear, clear);
    return run;
  }

  private async deliver(envelope: AgentEnvelope, operatorName: string): Promise<string> {
    const operator = { id: envelope.operatorId, name: operatorName };
    const message = formatHermesMessage(envelope);
    const sessionId = operatorSessionId(operator.id);
    await this.ensureSession(operator);
    let res = await this.request('POST', `/api/sessions/${encodeURIComponent(sessionId)}/chat`, { message }, CHAT_TIMEOUT_MS);
    if (res.status === 404) {
      // The session was deleted on the Hermes side: start a fresh one.
      this.known.delete(sessionId);
      await this.ensureSession(operator);
      res = await this.request('POST', `/api/sessions/${encodeURIComponent(sessionId)}/chat`, { message }, CHAT_TIMEOUT_MS);
    }
    if (!res.ok) throw new Error(`Hermes returned ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const body = (await res.json()) as { message?: { content?: unknown } };
    const content = body.message?.content;
    return typeof content === 'string' ? content : '';
  }

  private async ensureSession(operator: { id: string; name: string }): Promise<void> {
    const id = operatorSessionId(operator.id);
    if (this.known.has(id)) return;
    const res = await this.request(
      'POST',
      '/api/sessions',
      { id, title: `${operator.name} (${operator.id})`, system_prompt: this.policy.systemPrompt(operator) },
      15_000,
    );
    // 409 = already exists, which is the normal case after the first message.
    if (!res.ok && res.status !== 409) throw new Error(`Hermes could not open session ${id}: ${res.status} ${(await res.text()).slice(0, 200)}`);
    this.known.add(id);
  }

  private request(method: string, path: string, body: unknown, timeoutMs: number) {
    if (!this.configured) throw new Error('HERMES_API_URL / HERMES_API_KEY are not set on the server');
    return this.fetchFn(`${this.baseUrl!.replace(/\/$/, '')}${path}`, {
      method,
      headers: { authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  }
}
