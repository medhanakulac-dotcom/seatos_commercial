-- Feature-level usage from BigQuery (the weekly sync): for each operator and week, which SeatOS features were used,
-- how many events and on how many days. feature_usage is { "<feature code>": { "events": n, "days": n } } using the
-- feature codes of the Feature Event Map (bf = Booking Form, rm = Route Management, ...). operator_id is the SeatOS
-- operator id (dwh.dim_operator.operator_id), null for rows that came from a CSV upload.
alter table weekly_usage add column operator_id integer;
alter table weekly_usage add column feature_usage jsonb;
