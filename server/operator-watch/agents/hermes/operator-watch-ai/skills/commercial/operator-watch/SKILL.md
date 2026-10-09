---
name: operator-watch
description: "Only for messages headed [[kind:case]] ('Operator Watch run …'): assess this operator and submit_case with playbook + email draft. Not for chat questions or greetings."
version: 0.2.0
author: SeatOS Commercial
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [Commercial, Retention, Customer-Success, SeatOS]
    related_skills: [seatos-query]
---

# Operator Watch — one operator per message

A run message names the `run_id` and is sent into this operator's own session. Assess THIS operator only, from
the run's frozen HubSpot snapshot. A person reviews every draft; you never send anything or contact operators.

1. `get_operator(run_id, operator_id)` — record, deals, contacts, previous cases (commercial-workspace MCP).
2. Decide with the playbook below; base every statement on the snapshot — never invent numbers or usage.
3. `submit_case` once. Do NOT call `list_operators`, `submit_cases` or `complete_run`: the backend closes the run.
4. Reply with one short line summarising the case.

## Playbook (segment × HubSpot `health_status`)

| Segment | Unhealthy | Adopted (Watchlist) | Healthy |
|---|---|---|---|
| High | **Rescue** — ask for a 20-minute call | **Push to Healthy** | Grow — no email |
| Mid | **Adoption Push** | **Maintain / Light Push** | Maintain — no email |
| Low | **Automated Activation** | **Self-Service / Nudge** | Self-Service — no email |
| Dormant | Reactive Only — no email | Reactive Only — no email | Reactive Only — no email |

- `needs_outreach: true` only for non-Dormant, non-Healthy; otherwise `false` with a short `reason`.
- `playbook` = table name; `play_type`: Retention (Unhealthy), Adoption (Watchlist), Commercial (Healthy).
- `analysis`: 1–3 sentences citing the snapshot (segment, health, deal stage, days since last note).
  `next_step`: the concrete action. `signals`: e.g. `{detector: "HubSpot health", text: "Health status: Unhealthy"}`.
- Earlier decisions on this operator (rejections and their reasons, human edits to drafts) are in your memory:
  follow them.

## Email draft (only when needs_outreach)

- Language by country: Thailand `th`, Vietnam `vi`, Indonesia `id`, else `en`; set `draft.language`, write it all
  in that language. Sign with the owner's first name ("The seatOS team" if unassigned).
- Greeting → one line why (weekly customer review) → 2–3 data-grounded bullets → next step → ask → sign-off.
  Rescue asks for a 20-minute call this week; others are a light nudge; Activation/Self-Service stay short.
- Plain text, under ~180 words, subject under 70 chars; no links you weren't given, no discounts or commitments,
  no internal jargon ("segment", "playbook", "Unhealthy").
