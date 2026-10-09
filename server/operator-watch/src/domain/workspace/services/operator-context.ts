import { WorkspaceError } from '../errors/workspace.errors';
import { CrmActivitySource, WorkspaceStore } from '../types/repositories/workspace.ports';
import { RunService } from './run.service';

/**
 * Everything the workspace knows about one operator, without needing a run id: the CRM record from the latest run,
 * its recent cases, the latest case's email draft, and recent activity. Shared by the agent tools (MCP for Hermes,
 * get_operator_context for Claude).
 */
export async function operatorContext(runs: RunService, store: WorkspaceStore, operatorId: string) {
  const run = await runs.latestRun();
  if (!run) throw new WorkspaceError('No run yet, so there is no operator data');
  const { snapshot } = await runs.operatorsForRun(run.id);
  const operator = snapshot.accounts.find((a) => a.id === operatorId);
  if (!operator) throw new WorkspaceError(`Operator ${operatorId} is not in the latest run (${run.label})`);
  const cases = (await store.casesForOperator(operatorId)).slice(0, 5);
  const latest = cases[0];
  const draft = latest?.currentDraftId ? await store.getDraft(latest.currentDraftId) : undefined;
  const events = (await store.eventsForOperator(operatorId)).slice(-20);
  return {
    run: { id: run.id, label: run.label },
    operator,
    cases: cases.map((c) => ({ case_ref: c.caseRef, run_id: c.runId, playbook: c.playbook, outcome: c.outcome, state: c.state, analysis: c.analysis, next_step: c.nextStep, created_at: c.createdAt })),
    latest_draft: draft ? { case_ref: latest.caseRef, version: draft.version, language: draft.language, subject: draft.subject, body: draft.body } : null,
    activity: events.map((e) => ({ at: e.at, kind: e.kind, origin: e.origin, text: e.text })),
  };
}

/** HubSpot activity (notes, meetings, calls, emails, tasks, messages) for one operator of the latest run, newest first. */
export async function operatorActivity(runs: RunService, source: CrmActivitySource, operatorId: string, limit: number) {
  if (!source.connected) return { connected: false, items: [] };
  const run = await runs.latestRun();
  if (!run) throw new WorkspaceError('No run yet, so there is no operator data');
  const { snapshot } = await runs.operatorsForRun(run.id);
  const account = snapshot.accounts.find((a) => a.id === operatorId);
  if (!account) throw new WorkspaceError(`Operator ${operatorId} is not in the latest run (${run.label})`);
  return { connected: true, items: await source.activity(account, limit) };
}
