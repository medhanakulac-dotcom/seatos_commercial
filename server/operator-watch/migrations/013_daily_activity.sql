-- Daily activity from BigQuery (the daily sync): per operator and day, how many logins and counted actions, which WAO
-- categories and which features (events per feature code). The sync replaces each day it sends; the last 60 days are kept.
-- sessions: distinct GA sessions; country: operator country; in_base: live operator with an API booking operator that day (the WAO base).
-- Answers "who did not log in yesterday" and "who dropped activity" without waiting for the week to end.

create table operator_daily (
  day           date not null,
  operator_id   integer not null,
  operator_name text not null,
  name_key      text not null,
  account_id    text,
  logins        integer not null default 0,
  sessions      integer not null default 0,
  country       text,
  in_base       boolean not null default false,
  actions       integer not null default 0,
  categories    jsonb not null default '[]',
  features      jsonb not null default '{}',
  uploaded_at   timestamptz not null default now(),
  uploaded_by   text not null,
  primary key (day, operator_id)
);
create index operator_daily_account on operator_daily (account_id, day);
create index operator_daily_name on operator_daily (name_key);
