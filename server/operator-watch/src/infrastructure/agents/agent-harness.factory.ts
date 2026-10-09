import { AgentHarness } from '../../domain/workspace/types/repositories/workspace.ports';
import { HERMES_AUTHOR, HermesAccountAssistant } from '../hermes/hermes-account.assistant';
import { HermesAgentNotifier } from '../hermes/hermes-agent.notifier';
import { HermesSessionClient } from '../hermes/hermes-session.client';
import { HermesSessionTrigger } from '../hermes/hermes-session.trigger';
import { HermesWebhookTrigger } from '../hermes/hermes-webhook.trigger';
import { OperatorChatPolicy } from '../hermes/operator-chat/operator-chat.policy';
import { DisconnectedAccountAssistant, DisconnectedEmailRewriter } from '../workspace-mocks/disconnected-ai.adapters';
import { NoopAgentNotifier } from './noop-agent.notifier';

/** Picks the agent integration from config. A future harness is one more branch here. */
export function buildAgentHarness(sessions: HermesSessionClient, policy: OperatorChatPolicy): AgentHarness {
  if (sessions.configured) {
    const assistant = new HermesAccountAssistant(sessions, policy);
    return {
      id: 'hermes',
      author: assistant.author,
      assistant,
      trigger: new HermesSessionTrigger(sessions),
      notifier: new HermesAgentNotifier(sessions),
      rewriter: new DisconnectedEmailRewriter(),
    };
  }
  // Webhook-only Hermes: no session API, so no chat or notes, but runs still go to Hermes and its MCP submissions are its own.
  return {
    id: 'hermes',
    author: HERMES_AUTHOR,
    assistant: new DisconnectedAccountAssistant(),
    trigger: new HermesWebhookTrigger(),
    notifier: new NoopAgentNotifier(),
    rewriter: new DisconnectedEmailRewriter(),
  };
}
