-- Cut-off comparison from BigQuery (the daily sync): per operator, how its booking cut-off (hours before departure that
-- booking closes) compares with other operators on the same route, vehicle type and vehicle class. One snapshot, replaced by every sync.
-- diff_hours: booking-weighted own average minus the others' average (+ = closes earlier). detail: the segments that differ most.

create table operator_cutoff (
  operator_name     text not null,
  name_key          text not null,
  account_id        text,
  operator_id       integer not null primary key,
  bookings_compared integer not null,
  segments          integer not null,
  own_avg_hours     numeric(8, 2) not null,
  market_avg_hours  numeric(8, 2) not null,
  window_days       integer not null,
  detail            jsonb not null default '[]',
  computed_at       timestamptz not null default now(),
  uploaded_by       text not null
);
create index operator_cutoff_account on operator_cutoff (account_id);
create index operator_cutoff_name on operator_cutoff (name_key);
