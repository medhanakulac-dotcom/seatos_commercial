---
name: seatos-query
description: "Live SeatOS data for an operator: bookings, trends, routes, agents. Load when a question needs numbers the Context brief does not have."
version: 0.2.0
author: SeatOS Commercial
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [Commercial, SeatOS, Data-Query, Bookings]
    related_skills:
      - operator-watch
---

# SeatOS queries

Call these directly with `tool_call` — no `tool_search` / `tool_describe` needed. Batch independent calls in one turn.

## 1. operator_id (SeatOS number, not the HubSpot `D-…` id)

Use the id the backend already resolved: `[[seatos:<n>]]` in the message header, or "SeatOS operator_id" in the
Context brief. Only when neither is there: `mcp__mcphub__seatos_tools_tms_lookupOperator {name, limit?}` (fuzzy
name → `operator_id`, `operator_name`, `is_active`); if several match, say which you picked and why.

## 2. Bookings — `mcp__mcphub__seatos_tools_getBookingStats`

Args: `operator_id` (required), `group_by` (route|trip|agent|day|week|month), `date_from`/`date_to` (YYYY-MM-DD,
booking creation date), `godate_from`/`godate_to` (departure date), `status` (default CONFIRMED), `sort_by`
(bookings|seats|revenue), `limit`.

"How is this operator performing?" — one batch of two calls:
- `group_by: "month"`, `date_from` = same month last year, `date_to` = today, `limit: 24` (trend + year-on-year)
- `group_by: "route"`, last 90 days, `limit: 5` (where volume is)

## 3. Other tools (all need operator_id)

`mcp__mcphub__seatos_tools_operator_lookupRoutes`, `…_operator_lookupAgents`, `…_getOperatorActivity`,
`…_getTripHistory`, `…_history_getAgentBalance`, `…_resolveEntityContext` (prefix `mcp__mcphub__seatos_tools`).

## Reporting rules

- Say "confirmed bookings", not "tickets sold"; name the date basis (created vs departure).
- Compare equal periods; flag the current month as partial; a month missing from results is "no data returned",
  not a proven zero.
- Describe the trend, don't invent its cause; keep it separate from the HubSpot health label.
- Never show bank details, credentials or tokens from settings.

If a tool fails or times out, or you need SQL: `skill_view` with `name: seatos-query`, `file_path: references/troubleshooting.md`.
