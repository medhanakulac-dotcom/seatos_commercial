import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Markdown } from './markdown';

describe('Markdown (assistant chat)', () => {
  it('renders a pipe table with its header, aligned cells and inline bold', () => {
    const { container } = render(
      <Markdown text={'| Week | WAO | Tickets |\n|---|:---:|---:|\n| 2026-10-05 | **3/7** | 15 |\n| 2026-09-28 | 2/7 | 11 |'} />,
    );
    expect([...container.querySelectorAll('th')].map((c) => c.textContent)).toEqual(['Week', 'WAO', 'Tickets']);
    expect([...container.querySelectorAll('tbody tr')].map((r) => [...r.querySelectorAll('td')].map((c) => c.textContent))).toEqual([
      ['2026-10-05', '3/7', '15'],
      ['2026-09-28', '2/7', '11'],
    ]);
    expect(container.querySelector('td strong')?.textContent).toBe('3/7');
    expect((container.querySelectorAll('th')[1] as HTMLElement).style.textAlign).toBe('center');
    expect((container.querySelectorAll('td')[2] as HTMLElement).style.textAlign).toBe('right');
  });

  it('renders paragraphs, bullet and numbered lists, headings, code and italics', () => {
    const { container } = render(<Markdown text={'## Next steps\nCall the owner *today*.\nThen recap.\n\n- one\n- two with `code`\n\n1. first\n2. second'} />);
    expect(container.querySelector('.md-h strong')?.textContent).toBe('Next steps');
    expect(container.querySelector('p:not(.md-h)')?.innerHTML).toBe('Call the owner <em>today</em>.<br>Then recap.');
    expect([...container.querySelectorAll('ul li')].map((l) => l.textContent)).toEqual(['one', 'two with code']);
    expect(container.querySelector('li code')?.textContent).toBe('code');
    expect([...container.querySelectorAll('ol li')].map((l) => l.textContent)).toEqual(['first', 'second']);
  });

  it('never turns text into HTML or a script, and only links http(s) addresses', () => {
    const { container } = render(<Markdown text={'<script>alert(1)</script> <img src=x onerror=alert(1)> [ok](https://seatos.com) [bad](javascript:alert(1))'} />);
    expect(container.querySelector('script, img')).toBeNull();
    expect(container.textContent).toContain('<script>alert(1)</script>');
    const links = [...container.querySelectorAll('a')];
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['https://seatos.com']);
    expect(links[0].getAttribute('rel')).toContain('noopener');
    expect(container.textContent).toContain('[bad](javascript:alert(1))');
  });

  it('keeps snake_case names and a lone pipe in plain text', () => {
    render(<Markdown text={'The events are bf_operator_booking and tm_trip_stat | not a table'} />);
    expect(screen.getByText(/bf_operator_booking and tm_trip_stat \| not a table/)).toBeTruthy();
  });
});
