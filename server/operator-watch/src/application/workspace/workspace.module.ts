import { Module } from '@nestjs/common';
import { Pool } from 'pg';
import { buildAgentHarness } from '../../infrastructure/agents/agent-harness.factory';
import { AuthModule } from '../../auth/auth.module';
import { OperatorLinkService } from '../../domain/workspace/services/operator-link.service';
import { RunService } from '../../domain/workspace/services/run.service';
import { SendingService } from '../../domain/workspace/services/sending.service';
import { SettingsService } from '../../domain/workspace/services/workspace.shared';
import { WorkspaceService } from '../../domain/workspace/services/workspace.service';
import { operatorActivity, operatorContext } from '../../domain/workspace/services/operator-context';
import {
  ACCOUNT_ASSISTANT,
  AGENT_HARNESS,
  AGENT_JOB_QUEUE,
  AGENT_MEMORY_STORE,
  AgentJobQueue,
  AgentMemoryStore,
  CRM_ACTIVITY,
  CrmActivitySource,
  WEEKLY_DATA_STORE,
  AGENT_NOTIFIER,
  AgentHarness,
  CHAT_EVENTS,
  AGENT_TRIGGER,
  CRM_ACCOUNT_SOURCE,
  CRM_NOTE_SYNC,
  DRAFT_WRITER,
  EMAIL_REWRITER,
  EMAIL_SENDERS,
  TMS_DIRECTORY,
  WORKSPACE_CLOCK,
  WORKSPACE_STORE,
  WorkspaceStore,
} from '../../domain/workspace/types/repositories/workspace.ports';
import { ClaudeAccountAssistant, ClaudeAgentNotifier, ClaudeEmailRewriter, ClaudeRunTrigger, ModeRoutingTrigger } from '../../infrastructure/claude/claude.agent';
import { ClaudeClient, ClaudeLike, loadClaudeConfig } from '../../infrastructure/claude/claude.client';
import { ClaudeMemory } from '../../infrastructure/claude/claude.memory';
import { ClaudeRunWorker } from '../../infrastructure/claude/claude-run.worker';
import { SeatosTools } from '../../infrastructure/claude/seatos.tools';
import { CLAUDE } from '../../infrastructure/claude/claude.tokens';
import { PgAgentStore } from '../../infrastructure/database/pg-agent.store';
import { InMemoryAgentStore } from '../../infrastructure/workspace-mocks/in-memory-agent.store';
import { DatabaseModule, PG_POOL } from '../../infrastructure/database/database.module';
import { PgWorkspaceStore } from '../../infrastructure/database/pg-workspace.store';
import { EmailModule } from '../../infrastructure/email/email.module';
import { HubSpotEmailSender } from '../../infrastructure/email/hubspot.email-sender';
import { SmtpEmailSender } from '../../infrastructure/email/smtp.email-sender';
import { DefaultOperatorChatPolicy, OPERATOR_CHAT_POLICY, OperatorChatPolicy } from '../../infrastructure/hermes/operator-chat/operator-chat.policy';
import { HermesSessionClient } from '../../infrastructure/hermes/hermes-session.client';
import { ChatHub } from '../../infrastructure/realtime/chat.hub';
import { HubSpotAccountSource } from '../../infrastructure/hubspot/hubspot-account.source';
import { HubSpotClient, HUBSPOT_FETCH } from '../../infrastructure/hubspot/hubspot.client';
import { crmSourceMode, HUBSPOT_CONFIG, HubSpotConfig, loadHubSpotConfig } from '../../infrastructure/hubspot/hubspot.config';
import { HubSpotNoteSync } from '../../infrastructure/hubspot/hubspot-note.sync';
import { HubSpotActivitySource, NoCrmActivity } from '../../infrastructure/hubspot/hubspot-activity.source';
import { McpTmsDirectory } from '../../infrastructure/tms/mcp-tms.directory';
import { WorkspaceWorkers } from '../../infrastructure/scheduling/workspace.workers';
import { TemplateDraftWriter } from '../../infrastructure/workspace-drafts/template-draft.writer';
import { SystemClock } from '../../infrastructure/workspace-mocks/disconnected-ai.adapters';
import { InMemoryWorkspaceStore } from '../../infrastructure/workspace-mocks/in-memory-workspace.store';
import { MockHubSpotAccountSource, MockHubSpotNoteSync } from '../../infrastructure/workspace-mocks/mock-hubspot.adapters';
import { AdminController } from '../admin/admin.controller';
import { McpController } from '../agent/mcp.controller';
import { InternalController } from '../internal/internal.controller';
import { WeeklyDataController } from '../weekly/weekly-data.controller';
import { WeeklyIngestController } from '../weekly/weekly-ingest.controller';
import { WeeklyDataService } from '../../domain/workspace/services/weekly-data.service';
import { PgWeeklyDataStore } from '../../infrastructure/database/pg-weekly-data.store';
import { InMemoryWeeklyDataStore } from '../../infrastructure/workspace-mocks/in-memory-weekly-data.store';
import { WorkspaceController } from './controllers/workspace.controller';

const AGENT_STORE = Symbol('AGENT_STORE');

/**
 * Commercial Workspace: Operator Watch runs, cases, drafts, approvals and sending.
 * `DATABASE_URL` → Postgres (migrations applied on startup); without it (non-production only) an in-memory store.
 * `CRM_SOURCE=hubspot` reads live HubSpot data; the default `mock` serves the synthetic fixture.
 */
@Module({
  imports: [AuthModule, DatabaseModule, EmailModule],
  controllers: [WorkspaceController, AdminController, McpController, InternalController, WeeklyDataController, WeeklyIngestController],
  providers: [
    {
      provide: WORKSPACE_STORE,
      inject: [PG_POOL],
      useFactory: (pool: Pool | null) => (pool ? new PgWorkspaceStore(pool) : new InMemoryWorkspaceStore()),
    },
    // HubSpot client exists whenever a token is configured (live CRM and/or HubSpot sending).
    { provide: HUBSPOT_CONFIG, useFactory: (): HubSpotConfig | null => (crmSourceMode() === 'hubspot' || process.env.HUBSPOT_ACCESS_TOKEN ? loadHubSpotConfig() : null) },
    { provide: HUBSPOT_FETCH, useValue: fetch },
    {
      provide: HubSpotClient,
      inject: [HUBSPOT_CONFIG, HUBSPOT_FETCH],
      useFactory: (config: HubSpotConfig | null, fetchFn: typeof fetch) => (config ? new HubSpotClient(config, fetchFn) : null),
    },
    MockHubSpotAccountSource,
    MockHubSpotNoteSync,
    {
      provide: CRM_ACCOUNT_SOURCE,
      inject: [HUBSPOT_CONFIG, HubSpotClient, MockHubSpotAccountSource],
      useFactory: (config: HubSpotConfig | null, client: HubSpotClient | null, mock: MockHubSpotAccountSource) =>
        crmSourceMode() === 'hubspot' && config && client ? new HubSpotAccountSource(client, config) : mock,
    },
    {
      provide: CRM_NOTE_SYNC,
      inject: [HUBSPOT_CONFIG, HubSpotClient, MockHubSpotNoteSync],
      useFactory: (config: HubSpotConfig | null, client: HubSpotClient | null, mock: MockHubSpotNoteSync) =>
        crmSourceMode() === 'hubspot' && config && client ? new HubSpotNoteSync(client, config) : mock,
    },
    {
      provide: CRM_ACTIVITY,
      inject: [HUBSPOT_CONFIG, HubSpotClient],
      useFactory: (config: HubSpotConfig | null, client: HubSpotClient | null): CrmActivitySource =>
        crmSourceMode() === 'hubspot' && config && client ? new HubSpotActivitySource(client) : new NoCrmActivity(),
    },
    {
      provide: EMAIL_SENDERS,
      inject: [SmtpEmailSender, HubSpotClient],
      useFactory: (smtp: SmtpEmailSender, client: HubSpotClient | null) => [smtp, new HubSpotEmailSender(client)],
    },
    { provide: OPERATOR_CHAT_POLICY, useClass: DefaultOperatorChatPolicy },
    {
      provide: HermesSessionClient,
      inject: [OPERATOR_CHAT_POLICY],
      useFactory: (policy: OperatorChatPolicy) => new HermesSessionClient(undefined, undefined, undefined, policy),
    },
    { provide: AGENT_HARNESS, inject: [HermesSessionClient, OPERATOR_CHAT_POLICY], useFactory: buildAgentHarness },
    // Claude (ANTHROPIC_API_KEY) runs the agent inside the API: chat, rewrites and memory always use it when configured,
    // and runs use it when Settings → Agent is "claude". Without it the Hermes harness (or nothing) is used, as before.
    { provide: CLAUDE, useFactory: (): ClaudeLike | null => { const config = loadClaudeConfig(); return config && new ClaudeClient(config); } },
    { provide: AGENT_STORE, inject: [PG_POOL], useFactory: (pool: Pool | null) => (pool ? new PgAgentStore(pool) : new InMemoryAgentStore()) },
    { provide: AGENT_MEMORY_STORE, useExisting: AGENT_STORE },
    { provide: WEEKLY_DATA_STORE, inject: [PG_POOL], useFactory: (pool: Pool | null) => (pool ? new PgWeeklyDataStore(pool) : new InMemoryWeeklyDataStore()) },
    WeeklyDataService,
    { provide: AGENT_JOB_QUEUE, useExisting: AGENT_STORE },
    { provide: ClaudeMemory, inject: [AGENT_MEMORY_STORE, CLAUDE], useFactory: (store: AgentMemoryStore, claude: ClaudeLike | null) => claude && new ClaudeMemory(store, claude) },
    { provide: SeatosTools, useFactory: () => new SeatosTools() },
    {
      provide: AGENT_TRIGGER,
      inject: [AGENT_HARNESS, AGENT_JOB_QUEUE, CLAUDE],
      useFactory: (h: AgentHarness, queue: AgentJobQueue, claude: ClaudeLike | null) => new ModeRoutingTrigger(new ClaudeRunTrigger(queue, !!claude), h.trigger),
    },
    {
      provide: AGENT_NOTIFIER,
      inject: [AGENT_HARNESS, ClaudeMemory],
      useFactory: (h: AgentHarness, memory: ClaudeMemory | null) => (memory ? new ClaudeAgentNotifier(memory) : h.notifier),
    },
    {
      provide: EMAIL_REWRITER,
      inject: [AGENT_HARNESS, CLAUDE, ClaudeMemory, RunService, CRM_ACTIVITY, WeeklyDataService],
      useFactory: (h: AgentHarness, claude: ClaudeLike | null, memory: ClaudeMemory | null, runs: RunService, activity: CrmActivitySource, weekly: WeeklyDataService) =>
        claude ? new ClaudeEmailRewriter(claude, { memory, crmActivity: (id, limit) => operatorActivity(runs, activity, id, limit), weekly }) : h.rewriter,
    },
    {
      provide: ACCOUNT_ASSISTANT,
      inject: [AGENT_HARNESS, CLAUDE, ClaudeMemory, SeatosTools, RunService, WORKSPACE_STORE, CRM_ACTIVITY, WeeklyDataService],
      useFactory: (h: AgentHarness, claude: ClaudeLike | null, memory: ClaudeMemory | null, seatos: SeatosTools, runs: RunService, store: WorkspaceStore, activity: CrmActivitySource, weekly: WeeklyDataService) =>
        claude && memory
          ? new ClaudeAccountAssistant(claude, memory, seatos, (id) => operatorContext(runs, store, id), (id, limit) => operatorActivity(runs, activity, id, limit), weekly)
          : h.assistant,
    },
    {
      provide: ClaudeRunWorker,
      inject: [RunService, WORKSPACE_STORE, AGENT_JOB_QUEUE, CLAUDE, ClaudeMemory, CRM_ACTIVITY, WeeklyDataService],
      useFactory: (runs: RunService, store: WorkspaceStore, queue: AgentJobQueue, claude: ClaudeLike | null, memory: ClaudeMemory | null, activity: CrmActivitySource, weekly: WeeklyDataService) =>
        new ClaudeRunWorker(runs, store, queue, claude, memory, activity, weekly),
    },
    ChatHub,
    { provide: CHAT_EVENTS, useExisting: ChatHub },
    { provide: DRAFT_WRITER, useClass: TemplateDraftWriter },
    { provide: WORKSPACE_CLOCK, useClass: SystemClock },
    { provide: TMS_DIRECTORY, useFactory: () => new McpTmsDirectory() },
    OperatorLinkService,
    SettingsService,
    RunService,
    WorkspaceService,
    SendingService,
    WorkspaceWorkers,
  ],
  exports: [WorkspaceService, RunService, SendingService, SettingsService, WeeklyDataService, WORKSPACE_STORE],
})
export class WorkspaceModule {}
