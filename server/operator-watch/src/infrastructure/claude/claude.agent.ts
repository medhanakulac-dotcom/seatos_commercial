import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import type Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod/v4';
import { Actor, CRM_ACTIVITY_TYPES, CrmActivity } from '../../domain/workspace/entities/workspace.entities';
import { WorkspaceSettings } from '../../domain/workspace/services/settings';
import {
  AccountAssistant,
  AccountContext,
  AgentDispatch,
  AgentEvent,
  AgentJobQueue,
  AgentNotifier,
  AgentTrigger,
  ChatTurn,
  EmailRewriter,
  RunStartedEvent,
} from '../../domain/workspace/types/repositories/workspace.ports';
import { buildOperatorBrief } from '../hermes/operator-chat/operator-chat.brief';
import { renderHermesEvent } from '../hermes/hermes-agent.notifier';
import { background } from '../runtime/background';
import { ClaudeLike } from './claude.client';
import { ClaudeMemory } from './claude.memory';
import { CHAT_SYSTEM, REWRITE_SYSTEM } from './claude.prompts';
import { SeatosTools } from './seatos.tools';

export const CLAUDE_AUTHOR: Actor = { id: 'agent:claude', name: 'Claude' };

/** Chat turns kept in the prompt; older ones live on in memory. */
const HISTORY_TURNS = 20;
const MAX_TOOL_STEPS = 8;

/** Starts a run in Claude mode: one queued job per operator, worked off by the scheduler tick (ClaudeRunWorker). */
export class ClaudeRunTrigger implements AgentTrigger {
  constructor(
    private readonly queue: AgentJobQueue,
    private readonly configured: boolean,
  ) {}

  async trigger(event: RunStartedEvent): Promise<void> {
    if (!this.configured) throw new Error('Claude is not configured on the server (ANTHROPIC_API_KEY)');
    await this.queue.enqueue(event.runId, event.operators);
  }
}

/** Sends each run to the agent its settings name: Claude (queue) or Hermes (webhook / sessions). */
export class ModeRoutingTrigger implements AgentTrigger {
  constructor(
    private readonly claude: AgentTrigger,
    private readonly hermes: AgentTrigger,
  ) {}

  trigger(event: RunStartedEvent, settings: WorkspaceSettings): Promise<AgentDispatch | void> {
    return settings.agent.mode === 'claude' ? this.claude.trigger(event, settings) : this.hermes.trigger(event, settings);
  }
}

/**
 * The account chat on Claude. Each question goes out with the operator brief, the team's memory of the operator and
 * the recent shared chat; Claude may look up more with get_operator_context and, when configured, live SeatOS tools.
 * What was said is passed to memory after the reply (in the background).
 */
export class ClaudeAccountAssistant implements AccountAssistant {
  readonly author = CLAUDE_AUTHOR;
  readonly connected = true;

  constructor(
    private readonly claude: ClaudeLike,
    private readonly memory: ClaudeMemory,
    private readonly seatos: SeatosTools,
    private readonly operatorContext: (operatorId: string) => Promise<unknown>,
    private readonly crmActivity: (operatorId: string, limit: number) => Promise<{ connected: boolean; items: CrmActivity[] }> = async () => ({ connected: false, items: [] }),
  ) {}

  async ask({ account, question, asker, history }: { account: AccountContext; question: string; asker: string; history: readonly ChatTurn[] }): Promise<string> {
    const remembered = await this.memory.recall(account.id, question);
    const context = [
      buildOperatorBrief(account).text,
      remembered,
      `Today: ${new Date().toISOString().slice(0, 10)}`,
    ]
      .filter(Boolean)
      .join('\n\n');
    const messages: Anthropic.Beta.BetaMessageParam[] = [
      ...history.slice(-HISTORY_TURNS).map((t) => ({ role: t.role, content: t.text }) as const),
      { role: 'user', content: `${context}\n\n${asker} asks: ${question}` },
    ];
    // The API wants the conversation to start with the user and alternate; a stored assistant line first is dropped.
    while (messages[0]?.role === 'assistant') messages.shift();

    const lookup = betaZodTool({
      name: 'get_operator_context',
      description:
        'Everything the workspace knows about one operator: its CRM record from the latest run, recent cases (analysis, state, next step), ' +
        'the latest email draft and recent activity. Defaults to the operator this chat is about.',
      inputSchema: z.object({ operator_id: z.string().optional().describe('Only when a user explicitly asks about a different operator') }),
      run: async ({ operator_id }) => {
        try {
          return JSON.stringify(await this.operatorContext(operator_id || account.id));
        } catch (error) {
          return `Lookup failed: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    });

    const activityTool = betaZodTool({
      name: 'get_hubspot_activity',
      description:
        'What was logged with the operator in HubSpot, newest first: notes, meetings (with meeting notes), calls, emails, tasks and ' +
        'logged LINE/WhatsApp/SMS messages ("message"). Defaults to the operator this chat is about.',
      inputSchema: z.object({
        operator_id: z.string().optional().describe('Only when a user explicitly asks about a different operator'),
        type: z.enum(CRM_ACTIVITY_TYPES).optional().describe('Only this kind of activity'),
        limit: z.number().int().min(1).max(100).optional().describe('How many items (default 30)'),
      }),
      run: async ({ operator_id, type, limit }) => {
        try {
          const { connected, items } = await this.crmActivity(operator_id || account.id, type ? 100 : (limit ?? 30));
          if (!connected) return 'HubSpot is not connected, so there is no logged activity to read.';
          const picked = (type ? items.filter((i) => i.type === type) : items).slice(0, limit ?? 30);
          return JSON.stringify(picked.map(({ id: _id, url: _url, ...rest }) => rest));
        } catch (error) {
          return `HubSpot activity could not be read: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    });

    const answer = await this.claude.converse({
      system: CHAT_SYSTEM,
      messages,
      tools: [lookup, activityTool, ...(await this.seatos.tools())],
      effort: 'medium',
      maxIterations: MAX_TOOL_STEPS,
    });
    background(
      'Chat memory',
      this.memory.retain({ operatorId: account.id, operatorName: account.name, kind: 'chat', text: `${asker}: ${question}\nAssistant: ${answer}` }),
    );
    return answer;
  }
}

/** Decisions and email outcomes go into the agent's memory (was: record-only messages into the Hermes session). */
export class ClaudeAgentNotifier implements AgentNotifier {
  constructor(private readonly memory: ClaudeMemory) {}

  async notify(event: AgentEvent): Promise<void> {
    const text = renderHermesEvent(event)
      .split('\n')
      .filter((line) => !line.startsWith('Record only'))
      .join('\n');
    const source = event.caseRef;
    background(`Memory of ${event.type} for ${event.operatorId}`, this.memory.retain({ operatorId: event.operatorId, kind: event.type, text, source }));
  }
}

const Rewritten = z.object({ subject: z.string(), body: z.string() });

/** "Prompt" box on a draft: Claude applies a colleague's instruction to the current email. */
export class ClaudeEmailRewriter implements EmailRewriter {
  readonly connected = true;

  constructor(private readonly claude: ClaudeLike) {}

  rewrite({ account, language, subject, body, instruction }: { account: AccountContext; language: string; subject: string; body: string; instruction: string }) {
    const user = [
      buildOperatorBrief(account).text,
      `Draft language: ${language}`,
      `Subject: ${subject}`,
      'Body:',
      body,
      '',
      `Instruction: ${instruction}`,
    ].join('\n');
    return this.claude.structured({ system: REWRITE_SYSTEM, user, schema: Rewritten, effort: 'low' });
  }
}
