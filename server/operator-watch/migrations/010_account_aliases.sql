-- An account that is also reported under another SeatOS operator name: one HubSpot account, several operator names in
-- the weekly numbers (the same business trading as, or merged into, another SeatOS operator). The usage, tickets and
-- price comparison of every alias are shown on the account, next to its own.
create table account_aliases (
  account_id     text not null,
  operator_name  text not null,
  set_by         text not null,
  set_at         timestamptz not null default now(),
  primary key (account_id, operator_name)
);
create index account_aliases_name on account_aliases (operator_name);
