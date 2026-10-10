# Operator Watch on the site (Vercel + Supabase)

Operator Watch (from `rik-seatos/cs-operator-watch`) now runs inside this site:

| Part | Where |
|---|---|
| UI | `src/operator-watch`, opened from the sidebar's **Operator Watch** group |
| API | `server/operator-watch` (NestJS), served by the Vercel function `api/ow.js` at `/api/ow/*` |
| Data | Supabase Postgres, private schema `operator_watch` (not exposed through the Supabase REST API) |
| Sign-in | The site's Supabase login; the API checks the token with Supabase and requires the email in `allowed_users` |
| Scheduler | Supabase `pg_cron` calls `/api/ow/internal/tick` every minute (runs, sending, Claude work queue) |
| AI | Claude, called from the API: run assessments, account chat, prompt rewrites, team memory |

## 1. Supabase (once)

1. Open `supabase/setup.sql`, replace `CHANGE_ME_DB_PASSWORD` (a new strong password) and `CHANGE_ME_SITE_URL`
   (the production URL, no trailing slash), and run it in the SQL editor. It is safe to run again; after a new
   migration, regenerate it with `node server/operator-watch/scripts/build-supabase-setup.mjs` and run it again.
2. Store the cron secret in Vault (same value as `CRON_SECRET` below):
   `select vault.create_secret('<CRON_SECRET>', 'operator_watch_cron_secret');`

## 2. Vercel environment variables (production project)

| Variable | Value |
|---|---|
| `DATABASE_URL` | Supabase **transaction pooler** URL for the `operator_watch` role: `postgres://operator_watch.<project-ref>:<password>@<pooler-host>:6543/postgres?sslmode=require&uselibpqcompat=true` |
| `CRON_SECRET` | A long random string (`openssl rand -base64 32`); same value as the Vault secret |
| `ANTHROPIC_API_KEY` | Claude API key — turns on Claude runs, chat, rewrites and memory |
| `CRM_SOURCE` | `hubspot` (default `mock` serves sample data) |
| `HUBSPOT_ACCESS_TOKEN` | HubSpot private app token with `crm.objects.deals.read`, `crm.objects.companies.read`, `crm.objects.contacts.read` (deal contacts = email recipients), `crm.objects.owners.read`. The property defaults already match portal 48205146 (checked 2026-10-09: `health_status`, `client_segment`, `country`, pipeline "Client Pipeline" — 273 deals) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_ADDRESS` | To send approved emails over SMTP (see `.env.example`) |
| `AUTH_ADMIN_EMAILS` | Optional. Admins of the main site already become Operator Watch admins on first sign-in |
| `TMS_TOOLS_MCP_URL`, `TMS_TOOLS_MCP_TOKEN` | Optional. A SeatOS MCP server reachable from Vercel: live booking numbers in chat, operator id lookup |
| `WEEKLY_INGEST_TOKEN` | Optional. Bearer token the weekly BigQuery sync (`bigquery/weekly-sync.gs`, a Google Apps Script) uses to post feature usage to `/api/ow/ingest/weekly-usage`; the sync is off while it is unset. `openssl rand -hex 32`. Setup: `bigquery/README.md` |
| `OW_MODEL`, `OW_MEMORY_MODEL` | Optional. Default `claude-opus-5-5` |

The Supabase URL and anon key are read from the site's existing `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
The other two Vercel projects deployed from this repository do not need these variables; their `/api/ow` just
answers with an error.

## 3. In the app

Operator Watch → Settings (admins): choose **Agent → Claude**, set the run schedule, configure sending and keep
"Test mode: redirect all to" on until the first real run has been reviewed. "Run now" starts a run immediately.

## Differences from the original

- **AI**: Hermes and the Hindsight memory server are replaced by Claude calls from the API. The prompts, the
  operator-watch playbook and the memory rules are ported in `src/infrastructure/claude/claude.prompts.ts`.
  Memory lives in `operator_watch.agent_memories` (per operator plus team-wide lessons) and is searched with Postgres
  full-text search, so no embedding service is needed. Hermes still works if you set its variables and pick
  Agent → Hermes.
- **Runs**: a run queues one job per operator; the minute tick assesses a few at a time (`OW_AGENT_CONCURRENCY`,
  default 4) and closes the run when all are done. A run of ~60 operators takes a few minutes.
- **Chat**: re-read every 4 s instead of a websocket; no "is typing" indicators.
- **Sign-in**: Google OIDC and cookie sessions are gone; the site's Supabase session is used.
- **Not deployed**: `tms-tools/` and the Hermes profile in `agents/` are kept for reference only.
