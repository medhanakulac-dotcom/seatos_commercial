import type { ChatMessage } from './types';

export type ChatEvent =
  | { type: 'joined'; operatorId: string }
  | { type: 'message'; message: ChatMessage }
  | { type: 'typing'; operatorId: string; on: boolean; asker?: string }
  | { type: 'composing'; operatorId: string; userId: string; name: string; on: boolean };

export type ChatFeed = {
  /** Tell the room whether the current user is typing. No-op: there is no live channel on Vercel. */
  setTyping: (on: boolean) => void;
  close: () => void;
};

/** How often the open thread is re-read. */
export const CHAT_POLL_MS = 4_000;

/**
 * Feed for one operator's chat. The site runs on serverless functions, which cannot hold a websocket, so the thread
 * is re-read on an interval instead (`onOpen` is the caller's "re-read" hook). `onEvent` never fires and the status
 * stays "not live"; colleagues' typing indicators are not shown.
 */
export function watchChat(_operatorId: string, handlers: { onEvent: (e: ChatEvent) => void; onOpen: () => void; onStatus?: (live: boolean) => void }): ChatFeed {
  const timer = setInterval(handlers.onOpen, CHAT_POLL_MS);
  return { setTyping: () => undefined, close: () => clearInterval(timer) };
}
