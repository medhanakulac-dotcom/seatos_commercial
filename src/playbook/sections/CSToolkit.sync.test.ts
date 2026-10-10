import { describe, expect, it } from 'vitest';
import { CS_GOLDEN_RULES, CS_TIPS, formatCsToolkit } from '../../../server/operator-watch/src/infrastructure/claude/cs-toolkit';
import { csGoldenRules, CS_TIPS as PAGE_TIPS } from './CSToolkit.jsx';

// Claude's advice follows the CS Toolkit through a copy in the API; this keeps the copy equal to the Playbook page.
describe('CS Toolkit given to Claude', () => {
  it('matches the Playbook page — edit server/operator-watch/src/infrastructure/claude/cs-toolkit.ts together with CSToolkit.jsx', () => {
    expect(CS_GOLDEN_RULES).toEqual(csGoldenRules.map((r: { text: string }) => r.text));
    expect(CS_TIPS).toEqual(PAGE_TIPS);
  });

  it('puts every rule and tip in the prompt', () => {
    const text = formatCsToolkit();
    for (const r of CS_GOLDEN_RULES) expect(text).toContain(r);
    for (const t of CS_TIPS) expect(text).toContain(`- ${t.title}:`);
  });

  it('is unnumbered, so the assistant cannot cite rule or tip numbers', () => {
    const text = formatCsToolkit();
    expect(text).not.toMatch(/Tip \d/);
    expect(text).not.toMatch(/^\d+\. /m);
  });
});
