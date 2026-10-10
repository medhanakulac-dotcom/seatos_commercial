import { useEffect, useRef, useState } from 'react';
import { useMe, useMeta } from '../../api/queries';
import type { ChatMessage } from '../../api/types';
import { watchChat, type ChatFeed } from '../../api/chatSocket';
import { workspaceApi } from '../../api/workspace';
import { Markdown } from '../../lib/markdown';

/** Safety net when the live connection is down: the thread is re-read on this interval. */
const FALLBACK_POLL_MS = 15_000;

/** A colleague's "typing" signal is refreshed while they type; if it stops arriving, drop it after this long. */
const TYPING_EXPIRE_MS = 6_000;
/** How often our own "typing" signal is re-sent while typing, and how long after the last keystroke we say "stopped". */
const TYPING_SEND_MS = 3_000;
const TYPING_IDLE_MS = 4_000;
/** A conversation that has been quiet this long is cleared from the screen (the server also starts a fresh one). */
const CHAT_IDLE_MS = 10 * 60_000;

type Pending = { id: string; text: string; authorName: string };

/** "Chris is typing…", "Chris and Ann are typing…", "Chris, Ann and 2 others are typing…" */
export function typingLabel(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return `${names[0]} is typing…`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`;
  const rest = names.length - 2;
  return `${names[0]}, ${names[1]} and ${rest} other${rest > 1 ? 's' : ''} are typing…`;
}

const time = (iso: string) => new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

/**
 * Group chat about one operator. The thread is stored on the server and shared by the whole team; Hermes keeps
 * its own memory of it in a per-operator session.
 */
export function AssistantChat({ accountId, accountName }: { accountId: string; accountName: string }) {
  const { data: meta } = useMeta();
  const { data: me } = useMe();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState<Pending | null>(null);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [live, setLive] = useState(false);
  /** Name of the colleague whose question the agent is answering right now. */
  const [answering, setAnswering] = useState<string | null>(null);
  /** Colleagues currently typing, by user id. */
  const [typers, setTypers] = useState<Record<string, string>>({});
  const feed = useRef<ChatFeed | null>(null);
  const meId = useRef<string | undefined>(undefined);
  meId.current = me?.id;
  const box = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const chatInput = useRef<HTMLInputElement>(null);
  /** Popup mode: the chat fills the main area as a modal. */
  const [expanded, setExpanded] = useState(false);
  /** Height the inline card had before it was lifted out of the flow, so the page behind doesn't jump. */
  const [slotHeight, setSlotHeight] = useState<number>();
  const asking = pending !== null;

  useEffect(() => {
    setMessages([]);
    setPending(null);
    setAnswering(null);
    setLive(false);
    setTypers({});
    let stale = false;
    const expiry = new Map<string, ReturnType<typeof setTimeout>>();
    const forget = (userId: string) => {
      clearTimeout(expiry.get(userId));
      expiry.delete(userId);
      setTypers((cur) => {
        if (!(userId in cur)) return cur;
        const { [userId]: _gone, ...rest } = cur;
        return rest;
      });
    };
    const load = () =>
      workspaceApi
        .conversation(accountId)
        .then(({ messages: next }) => {
          if (stale) return;
          // Keep the same array (no re-render, no scroll jump) when nothing changed.
          setMessages((cur) => (cur.length === next.length && cur.at(-1)?.id === next.at(-1)?.id ? cur : next));
        })
        .catch(() => undefined);
    void load();
    const connection = watchChat(accountId, {
      onOpen: () => void load(),
      onStatus: (up) => !stale && setLive(up),
      onEvent: (e) => {
        if (stale) return;
        if (e.type === 'message') {
          setMessages((cur) => (cur.some((m) => m.id === e.message.id) ? cur : [...cur, e.message]));
          // Their message arrived, so they are no longer typing it.
          if (e.message.authorId) forget(e.message.authorId);
        } else if (e.type === 'composing' && e.operatorId === accountId) {
          if (e.userId === meId.current) return;
          if (!e.on) return forget(e.userId);
          setTypers((cur) => (cur[e.userId] === e.name ? cur : { ...cur, [e.userId]: e.name }));
          clearTimeout(expiry.get(e.userId));
          expiry.set(e.userId, setTimeout(() => forget(e.userId), TYPING_EXPIRE_MS));
        } else if (e.type === 'typing' && e.operatorId === accountId) setAnswering(e.on ? (e.asker ?? '') : null);
      },
    });
    const timer = setInterval(load, FALLBACK_POLL_MS);
    feed.current = connection;
    return () => {
      stale = true;
      feed.current = null;
      connection.close();
      clearInterval(timer);
      for (const t of expiry.values()) clearTimeout(t);
    };
  }, [accountId]);

  /** Announce our own typing: at most every few seconds while typing, and "stopped" when idle, empty or sent. */
  const lastSent = useRef(0);
  const idle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const announceTyping = (on: boolean) => {
    clearTimeout(idle.current);
    if (on) {
      const now = Date.now();
      if (now - lastSent.current >= TYPING_SEND_MS) {
        lastSent.current = now;
        feed.current?.setTyping(true);
      }
      idle.current = setTimeout(() => announceTyping(false), TYPING_IDLE_MS);
    } else if (lastSent.current) {
      lastSent.current = 0;
      feed.current?.setTyping(false);
    }
  };
  useEffect(() => () => clearTimeout(idle.current), []);

  /** Ten quiet minutes after the last line, the conversation is over: clear it. */
  useEffect(() => {
    const clearIfIdle = () => setMessages((cur) => (cur.length && Date.now() - Date.parse(cur[cur.length - 1].at) > CHAT_IDLE_MS ? [] : cur));
    clearIfIdle();
    const timer = setInterval(clearIfIdle, 15_000);
    return () => clearInterval(timer);
  }, [messages]);

  useEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [messages.length, asking, answering, expanded, typers]);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setExpanded(false);
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    chatInput.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [expanded]);

  const toggleExpanded = () => {
    setSlotHeight(card.current?.offsetHeight);
    setExpanded((v) => !v);
  };

  const send = async () => {
    const question = input.trim();
    if (!question || asking) return;
    setInput('');
    announceTyping(false);
    setError('');
    setPending({ id: 'pending', text: question, authorName: me?.name ?? 'You' });
    try {
      const { messages: added } = await workspaceApi.ask(accountId, question);
      setMessages((cur) => [...cur, ...added.filter((a) => !cur.some((m) => m.id === a.id))]);
    } catch (e) {
      setError(`The assistant returned an error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setPending(null);
    }
  };

  const line = (m: ChatMessage) => {
    const mine = m.role === 'user' && m.authorId === me?.id;
    const cls = m.role === 'assistant' ? 'a' : mine ? 'u' : 'o';
    return (
      <div key={m.id} className={`m ${cls}${m.role === 'assistant' ? ' md-msg' : ''}`}>
        <div className="who">
          {m.authorName}
          <span>{time(m.at)}</span>
        </div>
        {m.role === 'assistant' ? <Markdown text={m.text} /> : m.text}
      </div>
    );
  };

  return (
    <div className="chat-slot" style={expanded ? { minHeight: slotHeight } : undefined}>
      {expanded && <div className="chat-scrim" onClick={() => setExpanded(false)} />}
      <div
        ref={card}
        className={`card chat${expanded ? ' expanded' : ''}`}
        {...(expanded ? { role: 'dialog', 'aria-modal': true, 'aria-label': `Chat about ${accountName}` } : {})}
      >
        <h2 className="st">
          <span>Ask about {accountName}</span>
          <span className="chat-status">
            <span className="tg">{meta?.capabilities.assistant ? (live ? 'connected · live' : 'connected') : 'not connected'}</span>
            <button
              type="button"
              className="chat-expand"
              aria-label={expanded ? 'Exit full screen chat' : 'Open chat in full screen'}
              title={expanded ? 'Exit full screen (Esc)' : 'Full screen'}
              onClick={toggleExpanded}
            >
              {expanded ? (
                <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 2v4H2M10 14v-4h4M14 6h-4V2M2 10h4v4" />
                </svg>
              ) : (
                <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M2 6V2h4M14 10v4h-4M10 2h4v4M6 14H2v-4" />
                </svg>
              )}
            </button>
          </span>
        </h2>
        <div className="msgs" id="msgs" ref={box}>
          {messages.length || pending ? (
            <>
              {messages.map(line)}
              {pending && !messages.some((m) => m.role === 'user' && m.authorId === me?.id && m.text === pending.text && Date.now() - Date.parse(m.at) < 60_000) && (
                <div className="m u">
                  <div className="who">{pending.authorName}</div>
                  {pending.text}
                </div>
              )}
              {(pending || answering !== null) && <div className="m a w">{answering ? `The assistant is answering ${answering}…` : '…'}</div>}
            </>
          ) : (
            <div className="m a">Ask anything about this account. Everyone on the team sees this conversation.</div>
          )}
          {error && <div className="m a">{error}</div>}
          {Object.keys(typers).length > 0 && (
            <div className="typing" role="status">
              {typingLabel(Object.values(typers))}
            </div>
          )}
        </div>
        <div className="chatbar">
          <input
            id="chatin"
            ref={chatInput}
            placeholder="Type your question…"
            autoComplete="off"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              announceTyping(e.target.value.trim() !== '');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <button className="send" aria-label="Send" onClick={() => void send()}>
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
