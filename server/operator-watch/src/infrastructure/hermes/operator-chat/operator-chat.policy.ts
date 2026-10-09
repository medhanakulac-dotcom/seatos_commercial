import { AccountContext } from '../../../domain/workspace/types/repositories/workspace.ports';
import { buildOperatorBrief, OperatorBrief } from './operator-chat.brief';
import { operatorSystemPrompt } from './operator-chat.prompt';

/**
 * How the operator chat frames Hermes. Everything about *what the agent is told* sits behind this interface, so the
 * behaviour can change (different prompt, richer brief, retrieval instead of a brief) without touching the transport
 * (HermesSessionClient) or the assistant that orchestrates a turn.
 */
export interface OperatorChatPolicy {
  /** Standing instructions, fixed when the session is created. */
  systemPrompt(operator: { id: string; name: string }): string;
  /** Fresh facts about the operator; sent with a message only when `version` changed since the last send. */
  brief(account: AccountContext): OperatorBrief;
}

export const OPERATOR_CHAT_POLICY = Symbol('OPERATOR_CHAT_POLICY');

export class DefaultOperatorChatPolicy implements OperatorChatPolicy {
  systemPrompt = operatorSystemPrompt;
  brief = buildOperatorBrief;
}
