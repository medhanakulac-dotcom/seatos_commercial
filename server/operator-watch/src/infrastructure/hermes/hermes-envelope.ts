import { AgentEnvelope } from '../../domain/workspace/types/repositories/workspace.ports';

/**
 * Serializes an envelope to the agent wire format defined in contracts/agent-envelope (README + vectors.json, which
 * hermes-envelope.spec.ts checks this against). Readers such as the Hermes memory plugin depend only on that contract.
 * Line 1 is `[[key:value]]` tokens (operator, kind, seatos when known), then a blank line, then the body.
 */
export function formatHermesMessage(env: AgentEnvelope): string {
  const line = env.kind === 'chat' && env.asker ? `${env.asker} asks: ${env.text}` : env.text;
  const body = env.context ? `${env.context}\n\n${line}` : line;
  const seatos = env.tmsOperatorId != null ? ` [[seatos:${env.tmsOperatorId}]]` : '';
  return `[[operator:${env.operatorId}]] [[kind:${env.kind}]]${seatos}\n\n${body}`;
}
