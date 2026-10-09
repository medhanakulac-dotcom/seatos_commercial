import { formatEventTime, initials, pct } from './format';

describe('format', () => {
  it('builds initials from names and owners', () => {
    expect(initials('Mekong Gate Transport')).toBe('MG');
    expect(initials('Rina P.')).toBe('RP');
  });

  it('formats timeline stamps in Bangkok time', () => {
    const now = new Date('2026-09-30T05:00:00Z');
    expect(formatEventTime('2026-09-30T04:59:30Z', now)).toBe('Just now');
    expect(formatEventTime('2026-09-27T22:00:00Z', now)).toBe('Mon 05:00');
    expect(formatEventTime('2026-09-22', now)).toBe('2026-09-22');
    expect(formatEventTime('2026-09-01T03:00:00Z', now)).toBe('2026-09-01 10:00');
  });

  it('guards percentages against empty totals', () => {
    expect(pct(1, 3)).toBe(33);
    expect(pct(0, 0)).toBe(0);
  });
});
