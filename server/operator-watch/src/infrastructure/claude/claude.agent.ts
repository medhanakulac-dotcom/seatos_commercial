import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import type Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod/v4';
import { Actor, CRM_ACTIVITY_TYPES, CrmActivity } from '../../domain/workspace/entities/workspace.entities';
import { WorkspaceSettings } from '../../domain/workspace/services/settings';
import type { UsageWithFeatures } from '../../domain/workspace/services/weekly-data.service';
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
  WeeklyTicketRecord,
} from '../../domain/workspace/types/repositories/workspace.ports';
import { buildOperatorBrief } from '../hermes/operator-chat/operator-chat.brief';
import { renderHermesEvent } from '../hermes/hermes-agent.notifier';
import { background } from '../runtime/background';
import { ClaudeLike } from './claude.client';
import { ClaudeMemory } from './claude.memory';
import { CHAT_SYSTEM, COMPOSE_SYSTEM, formatActivity, formatWeekly, REWRITE_SYSTEM } from './claude.prompts';
import { SeatosTools } from './seatos.tools';

export const CLAUDE_AUTHOR: Actor = { id: 'agent:claude', name: 'Claude' };

/** Uploaded weekly numbers (WeeklyDataService). */
export interface WeeklyLookup {
  forAccount(accountId: string, weeks: number): Promise<{ usage: UsageWithFeatures[]; tickets: WeeklyTicketRecord[] }>;
  week(kind: 'usage' | 'tickets', week?: string): Promise<(UsageWithFeatures | WeeklyTicketRecord)[]>;
}

/** Chat turns kept in the prompt; older ones live on in memory. */
const HISTORY_TURNS = 20;
const MAX_TOOL_STEPS = 12; // an advice answer reads several tools, and each resumed web-research pause takes a step

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
    private readonly weekly: WeeklyLookup | null = null,
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

    const weekly = this.weekly;
    const weeklyTools = weekly
      ? [
          betaZodTool({
            name: 'get_weekly_numbers',
            description:
              "One operator's weekly SeatOS numbers uploaded by the team, newest week first: WAO (features used of 7, and which), " +
              'tickets sold and GMV in USD. Defaults to the operator this chat is about.',
            inputSchema: z.object({
              operator_id: z.string().optional().describe('Only when a user explicitly asks about a different operator'),
              weeks: z.number().int().min(1).max(52).optional().describe('How many weeks back (default 8)'),
            }),
            run: async ({ operator_id, weeks }) => {
              const data = await weekly.forAccount(operator_id || account.id, weeks ?? 8);
              return formatWeekly(data);
            },
          }),
          betaZodTool({
            name: 'list_weekly_numbers',
            description:
              'Every operator in one uploaded week, for rankings and comparisons: kind "usage" (WAO, sorted high to low) or "tickets" ' +
              '(tickets and GMV in USD, sorted high to low). Defaults to the latest uploaded week.',
            inputSchema: z.object({
              kind: z.enum(['usage', 'tickets']),
              week: z.string().optional().describe('Monday of the week, YYYY-MM-DD'),
            }),
            run: async ({ kind, week }) => {
              try {
                const rows = await weekly.week(kind, week);
                if (!rows.length) return 'Nothing uploaded for that week.';
                return JSON.stringify(
                  rows.map((r) =>
                    'tickets' in r
                      ? { week: r.week, operator: r.operatorName, operator_id: r.accountId, tickets: r.tickets, gmv_usd: r.gmvUsd }
                      : { week: r.week, operator: r.operatorName, operator_id: r.accountId, wao: r.featureCount },
                  ),
                );
              } catch (error) {
                return `Could not read that week: ${error instanceof Error ? error.message : String(error)}`;
              }
            },
          }),
        ]
      : [];

    const answer = await this.claude.converse({
      system: CHAT_SYSTEM,
      messages,
      tools: [lookup, activityTool, ...weeklyTools, ...(await this.seatos.tools())],
      effort: 'medium',
      maxIterations: MAX_TOOL_STEPS,
      web: true,
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

/** What Generate reads besides the account: the same sources an assessment uses. Each is optional context. */
export interface ComposeSources {
  readonly memory?: ClaudeMemory | null;
  readonly crmActivity?: (operatorId: string, limit: number) => Promise<{ connected: boolean; items: CrmActivity[] }>;
  readonly weekly?: WeeklyLookup | null;
}
const ACTIVITY_FOR_EMAIL = 15;
const WEEKS_FOR_EMAIL = 6;

/**
 * The email AI on Claude. Generate: writes a case's email from the analysis, next step, weekly numbers, HubSpot
 * activity and memory. "Prompt" box on a draft: applies a colleague's instruction to the current email.
 */
export class ClaudeEmailRewriter implements EmailRewriter {
  readonly connected = true;

  constructor(
    private readonly claude: ClaudeLike,
    private readonly sources: ComposeSources = {},
  ) {}

  async compose({ account, language, analysis, nextStep, playbook }: { account: AccountContext; language: string; analysis: string; nextStep: string; playbook: string }) {
    const { memory, crmActivity, weekly } = this.sources;
    const quietly = <T>(read: Promise<T> | undefined, format: (v: T) => string) => (read ? read.then(format, () => '') : Promise.resolve(''));
    const [numbers, activity, remembered] = await Promise.all([
      quietly(weekly?.forAccount(account.id, WEEKS_FOR_EMAIL), formatWeekly),
      quietly(crmActivity?.(account.id, ACTIVITY_FOR_EMAIL), (a) => (a.connected ? formatActivity(a.items) : '')),
      quietly(memory?.recall(account.id, `${playbook} email ${nextStep}`), (r) => r),
    ]);
    const user = [
      buildOperatorBrief(account).text,
      `Case: playbook ${playbook}\nAnalysis: ${analysis}\nNext step: ${nextStep || '(none given)'}`,
      numbers ? `Weekly SeatOS numbers (newest first):\n${numbers}` : '',
      activity ? `Recent HubSpot activity (newest first):\n${activity}` : '',
      remembered,
      `Write the email in: ${language}`,
    ]
      .filter(Boolean)
      .join('\n\n');
    return this.claude.structured({ system: COMPOSE_SYSTEM, user, schema: Rewritten, effort: 'medium' });
  }

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
