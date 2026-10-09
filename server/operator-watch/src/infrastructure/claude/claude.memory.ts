import { Logger } from '@nestjs/common';
import { z } from 'zod/v4';
import { AgentMemoryStore, MemoryFact } from '../../domain/workspace/types/repositories/workspace.ports';
import { ClaudeLike } from './claude.client';
import { MEMORY_SYSTEM, MEMORY_TOPICS } from './claude.prompts';

const OPERATOR_FACTS = 40;
const TEAM_FACTS = 10;
/** Facts shown to the extractor so it can skip duplicates and retire outdated ones. */
const KNOWN_FACTS = 60;

const Extraction = z.object({
  facts: z.array(
    z.object({
      text: z.string(),
      scope: z.enum(['operator', 'team']),
      topics: z.array(z.enum(MEMORY_TOPICS)),
    }),
  ),
  supersedes: z.array(z.string()),
});

export interface MemoryEvent {
  readonly operatorId: string;
  readonly operatorName?: string;
  readonly kind: MemoryFact['kind'];
  /** What happened, in plain words (a chat exchange, an assessment, a decision, a send). */
  readonly text: string;
  /** e.g. the case ref, for tracing a fact back. */
  readonly source?: string;
}

const day = (iso: string) => iso.slice(0, 10);

/**
 * The agent's long-term memory, replacing the Hindsight bank: recall is per operator plus team-wide lessons (as the
 * operator-hindsight plugin scoped it), and retain asks Claude what is worth keeping from what just happened.
 * Facts are tagged with the operator by the backend, never by the model.
 */
export class ClaudeMemory {
  private readonly logger = new Logger(ClaudeMemory.name);

  constructor(
    private readonly store: AgentMemoryStore,
    private readonly claude: ClaudeLike,
  ) {}

  /** A prompt block with what the team remembers about this operator, or '' when there is nothing. */
  async recall(operatorId: string, query: string): Promise<string> {
    const [own, team] = await Promise.all([this.store.forOperator(operatorId, OPERATOR_FACTS), this.store.team(query, TEAM_FACTS)]);
    if (!own.length && !team.length) return '';
    const lines = [
      ...own.map((f) => `- ${f.text} (${day(f.createdAt)})`),
      ...team.map((f) => `- ${f.text} (${day(f.createdAt)}, team-wide)`),
    ];
    return `## What the team remembers (may be outdated — prefer the current data)\n${lines.join('\n')}`;
  }

  /** Extracts and stores what is worth remembering. Never throws: memory must not break the work it follows. */
  async retain(event: MemoryEvent): Promise<number> {
    try {
      const known = await this.store.forOperator(event.operatorId, KNOWN_FACTS);
      const user = [
        `Operator: ${event.operatorName ? `${event.operatorName} ` : ''}(operator_id ${event.operatorId})`,
        `What happened (${event.kind}, ${day(new Date().toISOString())}):`,
        event.text,
        '',
        'Already remembered about this operator:',
        known.length ? known.map((f) => `- [${f.id}] ${f.text}`).join('\n') : '(nothing yet)',
      ].join('\n');
      const out = await this.claude.structured({ system: MEMORY_SYSTEM, user, schema: Extraction, effort: 'low', memory: true });
      const knownIds = new Set(known.map((f) => f.id));
      const added = await this.store.remember(
        out.facts
          .filter((f) => f.text.trim())
          .map((f) => ({ operatorId: f.scope === 'team' ? null : event.operatorId, kind: event.kind, text: f.text.trim(), topics: f.topics, source: event.source ?? null })),
        out.supersedes.filter((id) => knownIds.has(id)),
      );
      return added.length;
    } catch (error) {
      this.logger.warn(`Memory for ${event.operatorId} (${event.kind}) not stored: ${error instanceof Error ? error.message : String(error)}`);
      return 0;
    }
  }
}
