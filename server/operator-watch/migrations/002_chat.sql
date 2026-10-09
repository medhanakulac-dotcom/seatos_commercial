-- Group chat about one operator: every team member's questions and the agent's answers, in one shared thread.
create table chat_messages (
  id           uuid primary key,
  operator_id  text not null,
  role         text not null check (role in ('user', 'assistant')),
  author_id    text not null,
  author_name  text not null,
  text         text not null,
  created_at   timestamptz not null default now()
);
create index chat_messages_operator_idx on chat_messages (operator_id, created_at, id);
