import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AgentEnvelope } from '../../domain/workspace/types/repositories/workspace.ports';
import { formatHermesMessage } from './hermes-envelope';

/** Writer side of contracts/agent-envelope: every vector with an `envelope` must serialize to exactly its `message`. */
const vectors: { name: string; envelope?: AgentEnvelope; message: string }[] = JSON.parse(
  readFileSync(join(__dirname, '../../../contracts/agent-envelope/vectors.json'), 'utf8'),
);

describe('agent envelope contract (writer)', () => {
  const writable = vectors.filter((v) => v.envelope);

  it('has writer vectors', () => expect(writable.length).toBeGreaterThan(0));

  it.each(writable.map((v) => [v.name, v] as const))('%s', (_name, v) => {
    expect(formatHermesMessage(v.envelope!)).toBe(v.message);
  });
});
