import { ChatHub } from './chat.hub';

describe('ChatHub', () => {
  it('delivers events only to subscribers of that operator, and stops after unsubscribe', () => {
    const hub = new ChatHub();
    const a: unknown[] = [];
    const b: unknown[] = [];
    const offA = hub.subscribe('A', (e) => a.push(e));
    hub.subscribe('B', (e) => b.push(e));
    hub.publish('A', { type: 'typing', operatorId: 'A', on: true, asker: 'Ann' });
    offA();
    hub.publish('A', { type: 'typing', operatorId: 'A', on: false });
    expect(a).toHaveLength(1);
    expect(b).toHaveLength(0);
  });

  it('remembers who is being answered so late joiners see it', () => {
    const hub = new ChatHub();
    hub.publish('A', { type: 'typing', operatorId: 'A', on: true, asker: 'Ann' });
    expect(hub.answering('A')).toBe('Ann');
    hub.publish('A', { type: 'typing', operatorId: 'A', on: false });
    expect(hub.answering('A')).toBeUndefined();
  });

  it('relays colleague typing without mistaking it for the agent answering', () => {
    const hub = new ChatHub();
    const seen: unknown[] = [];
    hub.subscribe('A', (e) => seen.push(e));
    hub.publish('A', { type: 'composing', operatorId: 'A', userId: 'u2', name: 'Chris', on: true });
    expect(seen).toHaveLength(1);
    expect(hub.answering('A')).toBeUndefined();
  });
});
