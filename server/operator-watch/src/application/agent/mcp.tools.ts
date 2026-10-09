import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v4';
import { CRM_ACTIVITY_TYPES, LANGUAGES } from '../../domain/workspace/entities/workspace.entities';
import { WorkspaceError } from '../../domain/workspace/errors/workspace.errors';
import { operatorActivity, operatorContext } from '../../domain/workspace/services/operator-context';
import { nameKey } from '../../domain/workspace/services/weekly-data';
import { WeeklyDataService } from '../../domain/workspace/services/weekly-data.service';
import { RunService } from '../../domain/workspace/services/run.service';
import { CrmActivitySource, WorkspaceStore } from '../../domain/workspace/types/repositories/workspace.ports';

type ToolResult = { content: { type: 'text'; text: string }[]; isError?: boolean };

const ok = (data: unknown): ToolResult => ({ content: [{ type: 'text', text: JSON.stringify(data) }] });
const fail = (error: unknown): ToolResult => ({
  content: [{ type: 'text', text: error instanceof WorkspaceError ? error.message : `Internal error: ${error instanceof Error ? error.message : String(error)}` }],
  isError: true,
});
const safely = async (fn: () => Promise<unknown>): Promise<ToolResult> => {
  try {
    return ok(await fn());
  } catch (error) {
    return fail(error);
  }
};

/**
 * The Operator Watch tool contract for Hermes (Context 2 → Context 1 boundary).
 * Hermes never touches the database: it reads the frozen snapshot and submits one case per operator.
 */
export function buildMcpServer(
  runs: RunService,
  store: WorkspaceStore,
  authorId: string,
  extra: { weekly?: WeeklyDataService; crmActivity?: CrmActivitySource } = {},
): McpServer {
  const server = new McpServer({ name: 'commercial-workspace', version: '1.0.0' });

  server.registerTool(
    'find_operators',
    {
      description: 'Find operators (SeatOS customers) by name in the latest run. Returns operator_id, which every other tool takes.',
      inputSchema: { name: z.string().min(1).max(200) },
      annotations: { readOnlyHint: true },
    },
    ({ name }) =>
      safely(async () => {
        const run = await runs.latestRun();
        if (!run) return { operators: [] };
        const { snapshot } = await runs.operatorsForRun(run.id);
        const key = nameKey(name);
        const hits = snapshot.accounts.filter((a) => nameKey(a.name).includes(key));
        return { operators: hits.slice(0, 20).map((a) => ({ operator_id: a.id, name: a.name, segment: a.segment, health: a.crmHealth, owner: a.owner, country: a.country })) };
      }),
  );

  if (extra.weekly) {
    const weekly = extra.weekly;
    server.registerTool(
      'get_weekly_numbers',
      {
        description:
          "One operator's weekly SeatOS numbers uploaded by the team, newest week first: WAO (features used of 7, and which), tickets sold and GMV (USD).",
        inputSchema: { operator_id: z.string().min(1).max(64), weeks: z.number().int().min(1).max(52).default(8) },
        annotations: { readOnlyHint: true },
      },
      ({ operator_id, weeks }) => safely(() => weekly.forAccount(operator_id, weeks)),
    );
    server.registerTool(
      'list_weekly_numbers',
      {
        description:
          'Every operator in one uploaded week, for rankings and comparisons. kind "usage": WAO per operator (high to low); kind "tickets": tickets and GMV in USD (high to low). Defaults to the latest week.',
        inputSchema: { kind: z.enum(['usage', 'tickets']), week: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Monday of the week') },
        annotations: { readOnlyHint: true },
      },
      ({ kind, week }) => safely(async () => ({ rows: await weekly.week(kind, week) })),
    );
  }

  if (extra.crmActivity) {
    const source = extra.crmActivity;
    server.registerTool(
      'get_hubspot_activity',
      {
        description:
          'What was logged with an operator in HubSpot, newest first: notes, meetings (with meeting notes), calls, emails, tasks and logged LINE/WhatsApp/SMS messages ("message").',
        inputSchema: {
          operator_id: z.string().min(1).max(64),
          type: z.enum(CRM_ACTIVITY_TYPES).optional(),
          limit: z.number().int().min(1).max(100).default(30),
        },
        annotations: { readOnlyHint: true },
      },
      ({ operator_id, type, limit }) =>
        safely(async () => {
          const { connected, items } = await operatorActivity(runs, source, operator_id, type ? 100 : limit);
          return { connected, items: (type ? items.filter((i) => i.type === type) : items).slice(0, limit) };
        }),
    );
  }

  server.registerTool(
    'get_current_run',
    { description: 'The latest Operator Watch run: id, label, status and how many operators it covers.', annotations: { readOnlyHint: true } },
    () =>
      safely(async () => {
        const run = await runs.latestRun();
        if (!run) return { run: null };
        const { snapshot } = await runs.operatorsForRun(run.id);
        const cases = await store.casesForRun(run.id);
        return { run_id: run.id, label: run.label, status: run.status, trigger: run.trigger, playbook_version: run.playbookVersion, operator_count: snapshot.accounts.length, cases_submitted: cases.length };
      }),
  );

  server.registerTool(
    'list_operators',
    {
      description: "Operators in a run's frozen HubSpot snapshot (compact). Page with offset/limit. `submitted` tells you which you have already assessed.",
      inputSchema: { run_id: z.string().uuid(), offset: z.number().int().min(0).default(0), limit: z.number().int().min(1).max(300).default(100) },
      annotations: { readOnlyHint: true },
    },
    ({ run_id, offset, limit }) =>
      safely(async () => {
        const { snapshot } = await runs.operatorsForRun(run_id);
        const submitted = new Set((await store.casesForRun(run_id)).map((c) => c.operatorId));
        return {
          total: snapshot.accounts.length,
          offset,
          operators: snapshot.accounts.slice(offset, offset + limit).map((a) => ({
            operator_id: a.id,
            name: a.name,
            segment: a.segment,
            health: a.crmHealth,
            country: a.country,
            owner: a.owner,
            stage: a.deals[0]?.stage ?? null,
            last_note_at: a.lastNoteAt,
            has_contact: !!a.contacts?.length,
            submitted: submitted.has(a.id),
          })),
        };
      }),
  );

  server.registerTool(
    'get_operator',
    {
      description: 'Full record for one operator in a run: deals, contacts, and its previous cases (playbook, outcome, analysis) for context.',
      inputSchema: { run_id: z.string().uuid(), operator_id: z.string().min(1).max(64) },
      annotations: { readOnlyHint: true },
    },
    ({ run_id, operator_id }) =>
      safely(async () => {
        const { snapshot } = await runs.operatorsForRun(run_id);
        const account = snapshot.accounts.find((a) => a.id === operator_id);
        if (!account) throw new WorkspaceError(`Operator ${operator_id} is not in this run`);
        const history = (await store.casesForOperator(operator_id)).slice(0, 6);
        return {
          operator: account,
          current_case: history.find((c) => c.runId === run_id) ?? null,
          previous_cases: history
            .filter((c) => c.runId !== run_id)
            .map((c) => ({ case_ref: c.caseRef, playbook: c.playbook, outcome: c.outcome, state: c.state, analysis: c.analysis, created_at: c.createdAt })),
        };
      }),
  );

  server.registerTool(
    'get_operator_context',
    {
      description:
        'Everything the workspace knows about ONE operator, without needing a run_id: the CRM record from the latest run, its recent cases ' +
        '(analysis, state, next step), the email draft of the latest case, and recent activity. Use it for questions about a single operator, e.g. in chat.',
      inputSchema: { operator_id: z.string().min(1).max(64) },
      annotations: { readOnlyHint: true },
    },
    ({ operator_id }) => safely(() => operatorContext(runs, store, operator_id)),
  );

  const caseShape = {
    operator_id: z.string().min(1).max(64),
    needs_outreach: z.boolean(),
    analysis: z.string().min(1).max(20000).describe('Why: what the data shows about this operator'),
    next_step: z.string().max(2000).optional(),
    reason: z.string().max(2000).optional().describe('Why no outreach, when needs_outreach is false'),
    playbook: z.string().max(100).optional().describe('Playbook applied, e.g. Rescue, Adoption Push'),
    play_type: z.enum(['Retention', 'Adoption', 'Commercial']).optional(),
    language: z.enum(LANGUAGES).optional(),
    signals: z.array(z.object({ detector: z.string().max(60), text: z.string().max(300), code: z.string().max(20).optional() })).max(20).optional(),
    draft: z.object({ subject: z.string().min(1).max(300), body: z.string().min(1).max(20000), language: z.enum(LANGUAGES).optional() }).optional(),
  };
  type CaseInput = z.infer<z.ZodObject<typeof caseShape>>;
  const submit = (runId: string, a: CaseInput) =>
    runs.submitCase(
      runId,
      {
        operatorId: a.operator_id,
        needsOutreach: a.needs_outreach,
        analysis: a.analysis,
        nextStep: a.next_step,
        reason: a.reason,
        playbook: a.playbook,
        playType: a.play_type,
        language: a.language,
        signals: a.signals,
        draft: a.draft,
      },
      authorId,
    );
  const SUBMIT_HELP =
    'Calling again for the same operator updates the case (and adds a new draft version) until a person has reviewed it. ' +
    'Set needs_outreach=false with a reason when no email is needed. When outreach is needed, include the email draft. ' +
    'Guards may block outreach to Dormant/Healthy accounts; the response tells you.';

  server.registerTool(
    'submit_case',
    { description: `Record your assessment of one operator. ${SUBMIT_HELP}`, inputSchema: { run_id: z.string().uuid(), ...caseShape } },
    ({ run_id, ...a }) => safely(() => submit(run_id, a as CaseInput)),
  );

  server.registerTool(
    'submit_cases',
    {
      description: `Record assessments for up to 25 operators in one call (preferred for full runs). Each item is processed independently; the response lists a result or error per operator. ${SUBMIT_HELP}`,
      inputSchema: { run_id: z.string().uuid(), cases: z.array(z.object(caseShape)).min(1).max(25) },
    },
    ({ run_id, cases }) =>
      safely(async () => {
        const results = [];
        for (const c of cases as CaseInput[]) {
          try {
            results.push({ operator_id: c.operator_id, ok: true, ...(await submit(run_id, c)) });
          } catch (error) {
            results.push({ operator_id: c.operator_id, ok: false, error: error instanceof Error ? error.message : String(error) });
          }
        }
        return { submitted: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results };
      }),
  );

  server.registerTool(
    'complete_run',
    { description: 'Mark the run finished once every operator has been assessed.', inputSchema: { run_id: z.string().uuid(), summary: z.string().max(4000) } },
    ({ run_id, summary }) => safely(async () => ({ status: (await runs.completeRun(run_id, summary)).status })),
  );

  server.registerTool(
    'fail_run',
    { description: 'Mark the run failed if you cannot complete it (e.g. missing data).', inputSchema: { run_id: z.string().uuid(), error: z.string().min(1).max(4000) } },
    ({ run_id, error }) =>
      safely(async () => {
        await runs.failRun(run_id, error);
        return { status: 'failed' };
      }),
  );

  return server;
}
