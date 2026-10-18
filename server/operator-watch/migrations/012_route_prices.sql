-- Net and retail price per route from BigQuery (the daily sync): per operator, its average net price (what the operator
-- receives = the agent price) and retail price (what the customer pays) per ticket, by currency, city-to-city route,
-- vehicle type and vehicle class. One row per operator, replaced by every sync; routes holds the list.

create table operator_route_prices (
  operator_id   integer not null primary key,
  operator_name text not null,
  name_key      text not null,
  account_id    text,
  window_days   integer not null,
  routes        jsonb not null default '[]',
  computed_at   timestamptz not null default now(),
  uploaded_by   text not null
);
create index operator_route_prices_account on operator_route_prices (account_id);
create index operator_route_prices_name on operator_route_prices (name_key);
