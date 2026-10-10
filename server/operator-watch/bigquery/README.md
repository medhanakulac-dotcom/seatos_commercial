# Weekly BigQuery sync (feature usage and tickets → Operator Watch)

`weekly-sync.gs` is a Google Apps Script. It runs the usage query in BigQuery **as the person who installs it** (their own
Google access, no service account), and posts one row per operator to the site every morning:

- which of the 7 WAO categories fired (≥ 3 of 7 in a week = active operator),
- which SeatOS **features** were used that week, with event counts and active days, and
- **tickets sold** that week.

It sends the **current week so far** and the **previous week**; the site replaces those weeks each time, so reruns are safe.
Operator Watch shows the result on every operator's page (SeatOS weekly card), gives it to Claude (assessments, chat,
Generate) and to MCP tools (`get_weekly_numbers`, `list_weekly_numbers`).

## Where the data comes from

| Need | BigQuery (project `seatos-tms`) |
|---|---|
| Events | `raw_tables.events_flatten` (closed days) + `raw_tables.events_flatten_intraday` (today), partitioned on **`timestamp`** — always filter on `timestamp`, not `event_date`, or the whole table is scanned |
| Operator | `ep_operator_id` = `dwh.dim_operator.operator_id`; name from `dwh.dim_operator.operator_name` |
| Event → feature | the pattern of each feature (Feature Event Map, `^bf_` = Booking Form …) — `FEATURE_PATTERNS` in the script |
| Tickets | `dwh.fact_operator_tickets_actual_vs_target` (daily rows: `operator_id`, `date`, `daily_actual_tickets`), summed per Monday–Sunday week. Checked against Looker's Budget vs Actual export: same operators, same order (Lomlahkkhirin, Bundhaya Speed Boat, HK Busline…); the CSV was only the top 100 operators, the table has all ~245 |
| Event → WAO category | the events the map marks as counting toward WAO (tier A/B) — `WAO_EVENTS` in the script |

A week of events is about 10 MB of scan (tickets: 0.2 MB). Validated on the week of 5 Oct 2026 against Looker's WAO table: category counts within
±2 operators and WAO 68 vs 69.

Each operator is matched to its HubSpot deal by name (Settings → Weekly data lists names that need a one-time manual match).

## Setup (once)

1. Pick a secret token (any long random string) and set it in Vercel as **`WEEKLY_INGEST_TOKEN`** (project env, Production), then redeploy.
2. <https://script.google.com> → New project → paste `weekly-sync.gs`.
3. **Services** (+) → add **BigQuery API**.
4. **Project settings → Script properties** → add `INGEST_TOKEN` with the same token. (Optional `INGEST_URL`: the ingest base, default `https://dealsuite.app/api/ow/ingest`; the script adds `/weekly-usage` and `/weekly-tickets`.)
5. Run `syncAll` once (accept the permissions), then run `installTrigger` once. To fill history: run `syncBack(12)` (last 12 weeks).

Settings → Weekly data on the site shows whether the token is set and when the last sync arrived.

## When something changes

- New feature or renamed pattern: change `FEATURE_PATTERNS` here, `SEATOS_FEATURES` in `src/domain/workspace/services/seatos-features.ts` (names shown on the site), and the Playbook/Feature Event Map.
- A new event that should count toward WAO: add it to `WAO_EVENTS`.
- The script runs under the installer's Google account: if they leave, reinstall it from another account (the token stays the same).
