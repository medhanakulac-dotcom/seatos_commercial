import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssistantChat, typingLabel } from './AssistantChat';

const feed = vi.hoisted(() => ({
  handlers: undefined as undefined | { onEvent: (e: unknown) => void },
  setTyping: vi.fn(),
}));
vi.mock('../../api/chatSocket', () => ({
  watchChat: (_id: string, handlers: { onEvent: (e: unknown) => void }) => {
    feed.handlers = handlers;
    return { setTyping: feed.setTyping, close: () => undefined };
  },
}));
vi.mock('../../api/workspace', () => ({
  authApi: { me: async () => ({ id: 'u1', name: 'Rik' }), methods: async () => ({}) },
  workspaceApi: { meta: async () => ({ capabilities: { assistant: true } }), conversation: async () => ({ messages: [] }), ask: async () => ({ messages: [] }) },
}));

function renderChat() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AssistantChat accountId="A1" accountName="Alpha Ferry" />
    </QueryClientProvider>,
  );
}

describe('AssistantChat full screen', () => {
  // Shared spy: under React 18 the first test's typing reaches it too.
  beforeEach(() => feed.setTyping.mockClear());

  it('opens as a modal dialog, keeps the typed draft, and closes with the button, Esc or the backdrop', async () => {
    const user = userEvent.setup();
    const { container } = renderChat();
    expect(screen.queryByRole('dialog')).toBeNull();

    await user.type(screen.getByPlaceholderText('Type your question…'), 'draft question');
    await user.click(screen.getByRole('button', { name: 'Open chat in full screen' }));
    expect(screen.getByRole('dialog', { name: 'Chat about Alpha Ferry' })).toBeTruthy();
    expect(document.body.style.overflow).toBe('hidden');
    expect((screen.getByPlaceholderText('Type your question…') as HTMLInputElement).value).toBe('draft question');

    await user.click(screen.getByRole('button', { name: 'Exit full screen chat' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.body.style.overflow).toBe('');

    await user.click(screen.getByRole('button', { name: 'Open chat in full screen' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Open chat in full screen' }));
    await user.click(container.querySelector('.chat-scrim') as HTMLElement);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows who else is typing and tells the room when the current user types', async () => {
    const user = userEvent.setup();
    renderChat();
    await screen.findByText('connected');
    const composing = (userId: string, name: string, on: boolean) => act(() => feed.handlers!.onEvent({ type: 'composing', operatorId: 'A1', userId, name, on }));

    composing('u2', 'Chris', true);
    expect(screen.getByRole('status').textContent).toBe('Chris is typing…');
    composing('u3', 'Ann', true);
    expect(screen.getByRole('status').textContent).toBe('Chris and Ann are typing…');
    composing('u1', 'Rik', true); // ourselves: ignored
    expect(screen.getByRole('status').textContent).toBe('Chris and Ann are typing…');
    composing('u2', 'Chris', false);
    expect(screen.getByRole('status').textContent).toBe('Ann is typing…');
    act(() => feed.handlers!.onEvent({ type: 'message', message: { id: 'm1', operatorId: 'A1', role: 'user', authorId: 'u3', authorName: 'Ann', text: 'hi', at: new Date().toISOString() } }));
    expect(screen.queryByRole('status')).toBeNull();

    await user.type(screen.getByPlaceholderText('Type your question…'), 'hel');
    expect(feed.setTyping).toHaveBeenCalledTimes(1);
    expect(feed.setTyping).toHaveBeenLastCalledWith(true);
    await user.clear(screen.getByPlaceholderText('Type your question…'));
    expect(feed.setTyping).toHaveBeenLastCalledWith(false);
  });
});

describe('typingLabel', () => {
  it('summarises many typists', () => {
    expect(typingLabel(['A', 'B', 'C'])).toBe('A, B and 1 other are typing…');
    expect(typingLabel(['A', 'B', 'C', 'D'])).toBe('A, B and 2 others are typing…');
  });
});
