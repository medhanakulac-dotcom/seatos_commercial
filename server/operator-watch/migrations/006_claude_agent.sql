-- Claude agent (runs inside the API, no separate agent server): a work queue for run assessments and the agent's
-- long-term memory. Applied by src/infrastructure/database/migrator.ts or supabase/setup.sql.

-- One job per operator in a run. The scheduler tick claims a few at a time under a lease, so overlapping ticks never
-- assess the same operator twice; a job whose lease expired (the function was stopped) is picked up again.
create table agent_jobs (
  id               uuid primary key,
  run_id           uuid not null references workflow_runs(id) on delete cascade,
  operator_id      text not null,
  operator_name    text not null,
  tms_operator_id  integer,
  status           text not null default 'pending' check (status in ('pending', 'working', 'done', 'failed')),
  attempts         integer not null default 0,
  lease_until      timestamptz,
  error            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (run_id, operator_id)
);
create index agent_jobs_due on agent_jobs (status, lease_until);

-- What the agent remembers: facts about one operator, or team-wide lessons (operator_id null). Written only by the
-- backend from what happened (chats, assessments, decisions, sends), never by the model directly. A fact that a newer
-- one replaces keeps its row with superseded_by set.
create table agent_memories (
  id             uuid primary key,
  operator_id    text,
  kind           text not null check (kind in ('chat', 'case', 'decision', 'email')),
  text           text not null,
  topics         text[] not null default '{}',
  source         text,
  superseded_by  uuid references agent_memories(id),
  created_at     timestamptz not null default now(),
  search         tsvector generated always as (to_tsvector('simple', text)) stored
);
create index agent_memories_operator on agent_memories (operator_id, created_at desc) where superseded_by is null;
create index agent_memories_search on agent_memories using gin (search);
