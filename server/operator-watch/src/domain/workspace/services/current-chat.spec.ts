import { currentChat } from './workspace.service';

const MIN = 60_000;
const NOW = Date.parse('2026-10-10T12:00:00Z');
const line = (id: string, minutesAgo: number) => ({ id, at: new Date(NOW - minutesAgo * MIN).toISOString() });

describe('currentChat', () => {
  it('keeps a conversation that is still going', () => {
    const all = [line('a', 8), line('b', 5), line('c', 1)];
    expect(currentChat(all, NOW).map((m) => m.id)).toEqual(['a', 'b', 'c']);
  });

  it('shows nothing once the newest line is more than 10 minutes old', () => {
    expect(currentChat([line('a', 40), line('b', 11)], NOW)).toEqual([]);
  });

  it('starts fresh after a gap of more than 10 minutes inside the thread', () => {
    const all = [line('old1', 90), line('old2', 85), line('new1', 6), line('new2', 3)];
    expect(currentChat(all, NOW).map((m) => m.id)).toEqual(['new1', 'new2']);
  });

  it('copes with an empty thread', () => {
    expect(currentChat([], NOW)).toEqual([]);
  });
});
