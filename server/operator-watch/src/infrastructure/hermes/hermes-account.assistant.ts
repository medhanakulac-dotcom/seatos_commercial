import { Actor } from '../../domain/workspace/entities/workspace.entities';
import { AccountAssistant, AccountContext, ChatTurn } from '../../domain/workspace/types/repositories/workspace.ports';
import { HermesSessionClient, operatorSessionId } from './hermes-session.client';
import { DefaultOperatorChatPolicy, OperatorChatPolicy } from './operator-chat/operator-chat.policy';

export const HERMES_AUTHOR: Actor = { id: 'agent:hermes', name: 'Hermes' };

/**
 * Account chat backed by the operator's persistent Hermes session. Hermes keeps the agent's memory, so `history` is
 * ignored; the visible group-chat log lives in the workspace database. Several colleagues share one session, so each
 * message names who is asking. What the agent is told about the operator comes from the OperatorChatPolicy: a fresh
 * "Context" block rides along with a message only when the facts changed since the last one (the static system prompt
 * stays untouched, which keeps Hermes' prompt cache valid).
 */
export class HermesAccountAssistant implements AccountAssistant {
  /** Version of the last brief Hermes received per operator. Lost on restart, which just re-sends one brief. */
  private readonly briefed = new Map<string, string>();

  constructor(
    private readonly sessions: HermesSessionClient,
    private readonly policy: OperatorChatPolicy = new DefaultOperatorChatPolicy(),
  ) {}

  readonly author: Actor = HERMES_AUTHOR;

  get connected(): boolean {
    return this.sessions.configured;
  }

  async ask({ account, question, asker }: { account: AccountContext; question: string; asker: string; history: readonly ChatTurn[] }): Promise<string> {
    const brief = this.policy.brief(account);
    const stale = this.briefed.get(account.id) !== brief.version;
    const context = stale ? brief.text : undefined;
    const answer = await this.sessions.send({ operatorId: account.id, kind: 'chat', asker, tmsOperatorId: account.tmsOperatorId, context, text: question }, account.name);
    this.briefed.set(account.id, brief.version); // only after Hermes actually received it
    return answer;
  }

  sessionId(operatorId: string): string {
    return operatorSessionId(operatorId);
  }
}
