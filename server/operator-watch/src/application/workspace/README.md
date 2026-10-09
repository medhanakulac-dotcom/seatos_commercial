# Workspace API

Backs the Commercial Workspace UI (`web/`): weekly cases, email drafts, the approval gate and the send queue.
All routes need a session (`SessionGuard`); reads need `workspace:read`, mutations `workspace:review`
(team-wide permissions — not scoped to operator memberships). Mutations accept `application/json` only
(`JsonRequestGuard`), which with the SameSite=Lax session cookie blocks form-based CSRF.

| Method | Path | Purpose |
|---|---|---|
| GET | `/workspace/meta` | week, source snapshot, capabilities, languages, playbook matrix |
| GET | `/workspace/accounts` | every account with its weekly case (summary rows) |
| GET | `/workspace/accounts/:id` | full record: signals, deals, timeline, case history, rendered draft |
| GET | `/workspace/activity?limit=` | recent workspace actions |
| GET | `/workspace/sent` | send queue (approved drafts + token + draft hash) |
| GET | `/workspace/leader` | completion by owner this week, expiry last week |
| POST | `/workspace/accounts/:id/draft` | generate the draft |
| POST | `/workspace/accounts/:id/draft/rewrite` | `{ mode: regen \| shorter \| warmer \| direct }` |
| POST | `/workspace/accounts/:id/draft/language` | `{ language: en \| th \| vi \| id }` |
| POST | `/workspace/accounts/:id/draft/prompt` | `{ instruction }` — `applied: false` while no email model is connected |
| POST | `/workspace/accounts/:id/decision` | `{ decision: approve \| hold \| reject \| close \| reopen, reason?, editedBody? }` |
| POST | `/workspace/approvals/bulk` | `{ playbook, owner? }` approve every pending draft for a playbook |
| POST | `/workspace/accounts/:id/notes` | log a note (pushed to the CRM deal) · `/notes/:eventId/retry` |
| POST | `/workspace/accounts/:id/assistant` | `{ question, history }` account Q&A |

Domain errors map to `404` (unknown account) and `409` (transition not allowed from the case state).

## Rules (domain/workspace)

- Playbook = segment × product health (`playbook.rules.ts`). HubSpot `Watchlist` reads as `Adopted`.
- A case is one account's work for one week. Cases open Monday 05:00 Asia/Bangkok; pending/on-hold cases
  **expire** at the next rollover (`value-objects/week.ts`, `WorkspaceService.rollover`, run lazily on each request).
- Healthy accounts get no case; Dormant accounts are Reactive Only. Neither gets an email.
- Only `Automated Activation` drafts are written automatically; others wait for Generate.
- Approval enqueues the draft with its hash. **Any** later change to the draft voids the approval.

## Adapters

Bound in `workspace.module.ts`; swap a binding to go live without touching the domain or the UI.

| Port | Current adapter | Notes |
|---|---|---|
| `CRM_ACCOUNT_SOURCE` | `CRM_SOURCE=mock` (default): `MockHubSpotAccountSource` · `CRM_SOURCE=hubspot`: `HubSpotAccountSource` | mock serves synthetic `hubspot-deals.fixture.json` (`HUBSPOT_FIXTURE_PATH` loads a local export). Live mode is read-only, see below |
| `CRM_NOTE_SYNC` | mock: `MockHubSpotNoteSync` · hubspot: `HubSpotNoteSync` | live write-back is opt-in: `HUBSPOT_NOTES_ENABLED=true` |
| `WORKSPACE_REPOSITORY` | `InMemoryWorkspaceRepository` | process-local; needs a durable adapter before production |
| `DRAFT_WRITER` | `TemplateDraftWriter` | deterministic templates in 4 languages |
| `EMAIL_REWRITER`, `ACCOUNT_ASSISTANT` | `Disconnected*` | report "not connected" instead of inventing output |
| `WORKSPACE_CLOCK` | `SystemClock` | `WORKSPACE_NOW` pins the clock for demos / rollover testing |

## Live HubSpot (`CRM_SOURCE=hubspot`)

Uses a **private app** access token (`HUBSPOT_ACCESS_TOKEN`, in the gitignored `backend/.env` locally or the
deployment's secret store). The OAuth client-secret flow is not used. Required read scopes:
`crm.objects.deals.read`, `crm.objects.companies.read`, `crm.objects.owners.read`
(plus a notes write scope only if `HUBSPOT_NOTES_ENABLED=true`).

How HubSpot becomes workspace accounts (`infrastructure/hubspot/hubspot-account.source.ts`):

- Deals with `HUBSPOT_HEALTH_PROPERTY` set (default `health_status`) are pulled via CRM search.
- **One account per `HUBSPOT_PRIMARY_PIPELINE` deal** (Client Pipeline — each is an operator; account id
  `D-<dealId>`, name = deal name). Grouping by company is deliberately *not* used: one company holds 15
  operators. Other health-tagged deals (Customer Adoption projects) attach to the operator deal of the same
  company when that company has exactly one, otherwise by deal-name match; anything ambiguous stands alone.
- The main deal supplies health, owner, amount, dates and country (deal `country` dropdown, falling back to
  the company's free text). Segment is deal `client_segment` (High / Medium→Mid / Low / Dormant,
  case-insensitive; extra values via `HUBSPOT_SEGMENT_MAP`). An unrecognised segment is treated as
  **Dormant (no outreach)** and logged with the raw values.
- Pipeline/stage IDs and owner IDs are resolved to labels; deal links use the portal's own UI domain.
- The CRM is pulled on first request and again at each weekly rollover. A failed weekly refresh rolls over on
  the previous snapshot rather than blocking the week.

Run `npm run hubspot:discover` to check the token's scopes, list candidate properties/pipelines, and see how the
current mapping reads the portal (counts only).

`MockHistorySeeder` (mock mode only) gives each case a deterministic previous-week outcome so the Leader dashboard has data
(`WORKSPACE_SEED_HISTORY=false` to disable).

## Operator Watch pipeline (Postgres)

`DATABASE_URL` → Postgres; `migrations/*.sql` are applied on startup. Tables: `app_settings`, `crm_snapshots`,
`workflow_runs`, `operator_cases`, `case_drafts` (immutable versions), `case_decisions`, `case_events`, `send_jobs`.

1. **Schedule** (Settings → Pipeline, admin only): daily or weekly at a time/timezone. The in-process scheduler opens
   one run per period; `workflow_runs (kind, period_key)` is unique, so several backend replicas can't double-run.
   "Run now" opens a manual run.
2. **Run opens**: HubSpot is pulled into an immutable `crm_snapshots` row, and the previous run's `pending`/`hold`
   cases become `expired`.
3. **Agent**: `local` mode applies the built-in segment × health playbook immediately. `hermes` mode POSTs a signed
   webhook to Hermes, which then calls the MCP tools below and submits one case per operator.
4. **Guards** (backend-enforced): no proactive email to Dormant / Healthy accounts, whatever the agent proposes.
   A case a person has acted on can't be overwritten by the agent.
5. **Approval**: the reviewer picks the channel (SMTP or HubSpot, whichever the admin enabled) and confirms the
   recipient (pre-filled from the deal's HubSpot contact). The exact draft text is copied into `send_jobs`.
   Any later draft change cancels the job and voids the approval.
6. **Sending**: a worker delivers due jobs (`FOR UPDATE SKIP LOCKED`), never re-renders, and **Hermes never sends** —
   delivery is the backend's `SendingService` → a channel sender (`infrastructure/email`: SMTP via nodemailer, or HubSpot
   transactional single-send). Nothing goes out while Settings → "Send approved emails" is off. **Outside production,
   real recipients are always blocked** unless `SENDING_ALLOW_REAL_RECIPIENTS=true`; use Settings → "Test mode: redirect
   all to" instead, and test-mode deliveries are labelled as such everywhere ("the client was not emailed").

   - **Sender identity**: one shared From address (Settings → Email server, else `SMTP_FROM_ADDRESS`), optional shared
     Reply-To (Settings → Reply-To). Each message's `Message-ID` is `<jobId@from-domain>`.
   - **Failures**: permanent SMTP failures (5xx other than auth/config replies, bad envelope) fail the job at once;
     transient ones (4xx, network, timeouts, auth/config) retry with backoff, 5 attempts. A job whose worker died
     mid-send (still `sending` after 10 minutes) is **not resent** — SMTP cannot tell whether the server accepted it — it
     is failed as "delivery uncertain" for a person to check and re-approve.
   - **"Sent" means the mail server accepted it**; the server's reply is kept on the job (`provider_response`). Bounces
     after acceptance are not tracked yet.
   - **Throttle**: `SEND_MAX_PER_MINUTE` (default 30, per instance).
   - **Checks**: the SMTP connection is verified at boot (logged, non-blocking) and from Settings → "Verify connection".
     In production the app refuses to start if sending is on for a channel the server has no credentials for.

## Connecting Hermes

Backend env: `HERMES_WEBHOOK_SECRET` and `AGENT_API_TOKEN` (see `.env.example`). Settings → Agent: mode `hermes`,
webhook URL `http://<hermes-host>:8644/webhooks/operator-watch`.

In Hermes (`~/.hermes/config.yaml`, via `hermes config set` / `hermes webhook subscribe`):

```yaml
platforms:
  webhook:
    enabled: true
    extra:
      routes:
        operator-watch:
          events: ["operator_watch.run_started"]
          secret: "<HERMES_WEBHOOK_SECRET>"          # signature: X-Hub-Signature-256 (sha256=HMAC of body)
          prompt: "Operator Watch run {run_id} ({label}) started for {operator_count} operators. {instructions}"
          skills: ["<your operator-watch playbook skill>"]
mcp_servers:
  commercial-workspace:
    url: "https://<workspace-host>/api/mcp"
    headers:
      Authorization: "Bearer <AGENT_API_TOKEN>"
```

MCP tools (`application/agent/mcp.tools.ts`): `get_current_run`, `list_operators`, `get_operator`,
`submit_case` / `submit_cases` (batch ≤ 25; idempotent per run × operator; `needs_outreach`, `analysis`, optional `draft {subject, body, language}`),
`complete_run`, `fail_run`.

HubSpot as a send channel uses the transactional single-send API: it needs the Transactional Email add-on, the
`transactional-email` scope, and a transactional email (ID in Settings) whose template renders `{{ custom.subject }}`
and `{{ custom.body }}`.
