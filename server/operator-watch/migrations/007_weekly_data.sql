-- Weekly SeatOS numbers uploaded by the team (CSV exports from Looker), one row per operator per week:
-- feature usage (WAO) and tickets/GMV. Re-uploading a week replaces that week's rows for that file.
-- name_key is the normalised operator name used for matching; account_id is the matched workspace account (HubSpot
-- main deal), or null when the name did not match.

create table weekly_usage (
  week                     date not null,
  operator_name            text not null,
  name_key                 text not null,
  account_id               text,
  inventory_management     boolean not null,
  distribution_management  boolean not null,
  reservation_management   boolean not null,
  trip_management          boolean not null,
  fleet_management         boolean not null,
  analytics                boolean not null,
  accounting               boolean not null,
  feature_count            integer not null,
  uploaded_at              timestamptz not null default now(),
  uploaded_by              text not null,
  primary key (week, operator_name)
);
create index weekly_usage_account on weekly_usage (account_id, week desc);
create index weekly_usage_name on weekly_usage (name_key);

create table weekly_tickets (
  week           date not null,
  operator_name  text not null,
  name_key       text not null,
  account_id     text,
  gmv_usd        numeric(14, 2) not null,
  tickets        integer not null,
  uploaded_at    timestamptz not null default now(),
  uploaded_by    text not null,
  primary key (week, operator_name)
);
create index weekly_tickets_account on weekly_tickets (account_id, week desc);
create index weekly_tickets_name on weekly_tickets (name_key);

-- Names in the uploads that a person matched to an account by hand (normalised name → account), reused every week.
-- account_id null = "not an operator we track" (e.g. a demo account): never reported as unmatched again.
create table operator_name_links (
  name_key    text primary key,
  account_id  text,
  set_by      text not null,
  set_at      timestamptz not null default now()
);
