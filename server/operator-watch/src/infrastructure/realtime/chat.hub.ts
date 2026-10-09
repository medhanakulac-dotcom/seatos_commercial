import { ChatEvent, ChatEvents } from '../../domain/workspace/types/repositories/workspace.ports';

type Listener = (event: ChatEvent) => void;

/**
 * In-process pub/sub keyed by operator. It also remembers who the agent is currently answering, so a client that
 * connects (or reconnects) mid-answer still shows the typing indicator. Single backend instance only: running
 * several would need a shared bus (e.g. Postgres LISTEN/NOTIFY) behind the same interface.
 */
export class ChatHub implements ChatEvents {
  private readonly listeners = new Map<string, Set<Listener>>();
  private readonly busy = new Map<string, string>();

  publish(operatorId: string, event: ChatEvent): void {
    if (event.type === 'typing') {
      if (event.on) this.busy.set(operatorId, event.asker ?? '');
      else this.busy.delete(operatorId);
    }
    for (const listener of this.listeners.get(operatorId) ?? []) listener(event);
  }

  /** Returns an unsubscribe function. */
  subscribe(operatorId: string, listener: Listener): () => void {
    const set = this.listeners.get(operatorId) ?? new Set<Listener>();
    set.add(listener);
    this.listeners.set(operatorId, set);
    return () => {
      set.delete(listener);
      if (!set.size) this.listeners.delete(operatorId);
    };
  }

  /** Who the agent is answering right now, if anyone. */
  answering(operatorId: string): string | undefined {
    return this.busy.get(operatorId);
  }
}
