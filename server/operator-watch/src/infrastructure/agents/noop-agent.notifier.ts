import { AgentNotifier } from '../../domain/workspace/types/repositories/workspace.ports';

/** Used when no agent is connected: there is no session to tell, so events are dropped. */
export class NoopAgentNotifier implements AgentNotifier {
  async notify(): Promise<void> {}
}
