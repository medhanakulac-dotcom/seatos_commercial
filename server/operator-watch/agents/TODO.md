# Operator agent — todo

Working list for the operator assistant (backend agent harness, Hermes `operator-watch-ai`, Hindsight memory).
Tick items off in the commit that finishes them.

## Done

- [x] Agent harness abstraction, decision notes to the agent, hold/close reasons (`f880ccfe`, `07471004`)
- [x] SeatOS operator id resolution via `tms:lookupOperator` + account-page confirm (`f880ccfe`, `93b382a2`)
- [x] Slimmer skills: 41 → 2 enabled, exact tool names; "How is this operator performing?" 10 calls / 43s → 3 calls / 14s
- [x] Agent envelope contract shared by backend and harnesses (`773714e5`)
- [x] Version the Hermes side in the repo (`agents/hermes/operator-watch-ai`, `8b34554e`)
- [x] Fix: plugin talks to Hindsight over plain HTTP — memory never worked inside the gateway before (`8b34554e`)
- [x] Retest memory on a real operator: Bangkok Travel Plus note stored as 2 facts tagged `operator:D-30914159364`,
      `seatos:26281`; scoped recall returns them; Phi Phi Cruiser's agent doesn't know them

## Next

- [ ] **Base prompt grew 11.4k → 15.4k tokens** — log the recall block size per turn to confirm whether recall is the
      cause; cap or trim it if so.
- [ ] **Jev intent + backend prefetch** — offline: label 50–100 real chat questions, measure Jev accuracy at 0.85.
      Then: backend classifies each question and fetches the data (e.g. booking stats) before the harness runs.
      Target: "How is this operator performing?" in 1 LLM call.
- [ ] **Pin the most-used tools** — last run did no tool_search; confirm over a few more runs before changing config.

## Later

- [ ] Durable outbox for decision/email notes (in-process retries are lost on backend restart)
- [ ] Concurrency limit for bulk-approve notes (one agent turn per case, all at once today)
- [ ] Slack: bind a conversation to an operator once confirmed, re-tag its `scope:unbound` memories
- [ ] Tighten the `operator-watch` skill description (a bare session loaded it for a chat message)
- [ ] `setup_bank.py`: drop `hindsight_client` like the plugin did
- [ ] `topic:*` labels rarely applied (none on the Bangkok payout/report note) — review label descriptions or drop them

## Before going live

- [ ] Point the profile at the real `operator-watch` bank (`OPERATOR_MEMORY_BANK`)
- [ ] Remove the unused Hermes Python env (`~/.hermes/installs/…/environments/4c8ae…`)
- [ ] Push `feat/operator-agent-memory` and open a PR
