-- Price comparison from BigQuery (the daily sync): per operator and currency, how its average ticket price compares with
-- other operators on the same route, vehicle type and vehicle class. One snapshot, replaced by every sync.
-- price_pct: ticket-weighted difference in percent (+ = more expensive). detail: the segments that differ most.

create table operator_pricing (
  operator_name    text not null,
  name_key         text not null,
  account_id       text,
  operator_id      integer not null,
  currency         text not null,
  tickets_compared integer not null,
  segments         integer not null,
  price_pct        numeric(8, 2) not null,
  window_days      integer not null,
  detail           jsonb not null default '[]',
  computed_at      timestamptz not null default now(),
  uploaded_by      text not null,
  primary key (operator_id, currency)
);
create index operator_pricing_account on operator_pricing (account_id);
create index operator_pricing_name on operator_pricing (name_key);
