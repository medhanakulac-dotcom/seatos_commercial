-- Commercial Workspace: Operator Watch runs, cases, drafts, approvals and sending.
-- Applied by src/infrastructure/database/migrator.ts (tracked in schema_migrations).

-- Admin-only configuration (pipeline cadence, agent, sending, guards). Secrets never live here.
create table app_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  text
);

-- Immutable CRM pull. Every run reasons over exactly one snapshot.
create table crm_snapshots (
  id             uuid primary key,
  source         text not null check (source in ('mock', 'hubspot')),
  portal         text not null,
  description    text not null,
  pulled_at      timestamptz not null,
  content_hash   text not null,
  account_count  integer not null,
  accounts       jsonb not null,
  created_at     timestamptz not null default now()
);

-- One pipeline execution. period_key makes scheduled runs idempotent across instances.
create table workflow_runs (
  id                uuid primary key,
  kind              text not null default 'operator_watch',
  period_key        text not null,
  label             text not null,
  trigger           text not null check (trigger in ('schedule', 'manual')),
  status            text not null check (status in ('running', 'completed', 'failed')),
  agent             text not null,
  playbook_version  text,
  snapshot_id       uuid not null references crm_snapshots(id),
  case_seq          integer not null default 0,
  summary           text,
  error             text,
  triggered_by      text,
  started_at        timestamptz not null default now(),
  completed_at      timestamptz,
  unique (kind, period_key)
);
create index workflow_runs_started_idx on workflow_runs (started_at desc);

-- One operator's work within one run. The agent submits it; people decide on it.
create table operator_cases (
  id                uuid primary key,
  run_id            uuid not null references workflow_runs(id),
  case_ref          text not null,
  operator_id       text not null,
  operator_name     text not null,
  owner             text,
  segment           text not null,
  health            text not null,
  crm_health        text not null,
  outcome           text not null check (outcome in ('outreach', 'no_action')),
  state             text not null check (state in ('pending', 'approved', 'hold', 'rejected', 'closed', 'expired', 'no_action', 'reactive')),
  playbook          text not null,
  play_type         text not null,
  signals           jsonb not null default '[]',
  analysis          text not null default '',
  next_step         text not null default '',
  language          text not null default 'en',
  author            text not null,
  playbook_version  text,
  current_draft_id  uuid,
  reject_reason     text,
  void_note         text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (run_id, operator_id),
  unique (case_ref)
);
create index operator_cases_operator_idx on operator_cases (operator_id, created_at desc);
create index operator_cases_open_idx on operator_cases (state) where state in ('pending', 'hold');

-- Draft versions are never edited in place; approvals bind to draft_hash.
create table case_drafts (
  id          uuid primary key,
  case_id     uuid not null references operator_cases(id),
  version     integer not null,
  language    text not null,
  subject     text not null,
  body        text not null,
  draft_hash  text not null,
  author      text not null,
  writer      text not null check (writer in ('agent', 'template', 'human')),
  mods        jsonb not null default '{}',
  qa          text not null default 'not_run',
  created_at  timestamptz not null default now(),
  unique (case_id, version)
);
alter table operator_cases add constraint operator_cases_current_draft_fk foreign key (current_draft_id) references case_drafts(id);

create table case_decisions (
  id          uuid primary key,
  case_id     uuid not null references operator_cases(id),
  draft_id    uuid references case_drafts(id),
  decision    text not null check (decision in ('approve', 'hold', 'reject', 'close', 'reopen')),
  reason      text,
  channel     text,
  recipient   text,
  actor_id    text not null,
  actor_name  text not null,
  created_at  timestamptz not null default now()
);

-- Timeline shown on the account record (per operator, across runs).
create table case_events (
  id           uuid primary key,
  operator_id  text not null,
  case_id      uuid references operator_cases(id),
  at           text not null,
  kind         text not null,
  origin       text not null,
  text         text not null,
  note         text,
  crm_sync     text,
  crm_error    text,
  created_at   timestamptz not null default now()
);
create index case_events_operator_idx on case_events (operator_id, created_at);
create index case_events_user_idx on case_events (created_at desc) where origin = 'user';

-- The exact approved text is copied here; the sender never re-renders or calls a model.
create table send_jobs (
  id                   uuid primary key,
  case_id              uuid not null references operator_cases(id),
  draft_id             uuid not null references case_drafts(id),
  draft_hash           text not null,
  channel              text not null check (channel in ('smtp', 'hubspot')),
  recipient            text not null,
  subject              text not null,
  body                 text not null,
  token                text not null,
  status               text not null check (status in ('queued', 'sending', 'sent', 'failed', 'cancelled')),
  delivered_to         text,
  scheduled_for        timestamptz not null,
  attempts             integer not null default 0,
  provider_message_id  text,
  error                text,
  sent_at              timestamptz,
  created_at           timestamptz not null default now()
);
create index send_jobs_due_idx on send_jobs (scheduled_for) where status = 'queued';
create index send_jobs_case_idx on send_jobs (case_id);
