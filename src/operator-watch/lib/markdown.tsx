import { Fragment, type ReactNode } from 'react';

/**
 * A small, safe markdown renderer for the assistant's chat answers: paragraphs, headings, bullet and numbered lists,
 * pipe tables, fenced code, **bold**, *italic*, `code` and [text](https://link). Everything is built as React elements
 * (never HTML strings), so nothing the model or a web page says can inject markup or scripts.
 */

const INLINE = /(`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\s][^*\n]*\*|\[[^\]\n]+\]\(https?:\/\/[^)\s]+\))/g;

function inline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (!part) return null;
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) return <code key={key}>{part.slice(1, -1)}</code>;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return <strong key={key}>{inline(part.slice(2, -2), key)}</strong>;
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={key}>{inline(part.slice(1, -1), key)}</em>;
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
    if (link)
      return (
        <a key={key} href={link[2]} target="_blank" rel="noopener noreferrer">
          {link[1]}
        </a>
      );
    return <Fragment key={key}>{part}</Fragment>;
  });
}

const cells = (line: string): string[] => {
  const t = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return t.split('|').map((c) => c.trim());
};
const isSeparator = (line: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line) && line.includes('-');
const isTableStart = (lines: string[], i: number) => lines[i].includes('|') && i + 1 < lines.length && isSeparator(lines[i + 1]) && lines[i + 1].includes('|');
const align = (sep: string): ('left' | 'right' | 'center')[] =>
  cells(sep).map((c) => (c.startsWith(':') && c.endsWith(':') ? 'center' : c.endsWith(':') ? 'right' : 'left'));

export function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const out: ReactNode[] = [];
  let i = 0;
  let k = 0;
  const key = () => `b${k++}`;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.trim().startsWith('```')) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) code.push(lines[i++]);
      i++;
      out.push(
        <pre key={key()}>
          <code>{code.join('\n')}</code>
        </pre>,
      );
      continue;
    }
    if (isTableStart(lines, i)) {
      const head = cells(line);
      const al = align(lines[i + 1]);
      const body: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim() && lines[i].includes('|')) body.push(cells(lines[i++]));
      const k0 = key();
      out.push(
        <div key={k0} className="md-scroll">
          <table>
            <thead>
              <tr>
                {head.map((h, c) => (
                  <th key={c} style={{ textAlign: al[c] ?? 'left' }}>
                    {inline(h, `${k0}h${c}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, r) => (
                <tr key={r}>
                  {head.map((_, c) => (
                    <td key={c} style={{ textAlign: al[c] ?? 'left' }}>
                      {inline(row[c] ?? '', `${k0}r${r}c${c}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    const heading = line.match(/^\s{0,3}#{1,6}\s+(.*)$/);
    if (heading) {
      const k0 = key();
      out.push(
        <p key={k0} className="md-h">
          <strong>{inline(heading[1], k0)}</strong>
        </p>,
      );
      i++;
      continue;
    }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      out.push(<hr key={key()} />);
      i++;
      continue;
    }
    const bullet = /^\s*[-*•]\s+(.*)$/;
    const numbered = /^\s*\d+[.)]\s+(.*)$/;
    if (bullet.test(line) || numbered.test(line)) {
      const ordered = numbered.test(line);
      const re = ordered ? numbered : bullet;
      const items: string[] = [];
      while (i < lines.length && re.test(lines[i])) items.push(lines[i++].match(re)![1]);
      const k0 = key();
      const li = items.map((t, n) => <li key={n}>{inline(t, `${k0}i${n}`)}</li>);
      out.push(ordered ? <ol key={k0}>{li}</ol> : <ul key={k0}>{li}</ul>);
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !lines[i].trim().startsWith('```') && !isTableStart(lines, i) && !/^\s*([-*•]\s+|\d+[.)]\s+|#{1,6}\s+)/.test(lines[i])) para.push(lines[i++]);
    if (!para.length) {
      para.push(lines[i++]); // a line that looks like markup but is not: show it as text
    }
    const k0 = key();
    out.push(
      <p key={k0}>
        {para.map((t, n) => (
          <Fragment key={n}>
            {n > 0 && <br />}
            {inline(t, `${k0}l${n}`)}
          </Fragment>
        ))}
      </p>,
    );
  }
  return <div className="md">{out}</div>;
}
