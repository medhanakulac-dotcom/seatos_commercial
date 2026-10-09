# Commercial Workspace — web

React + TypeScript + Vite SPA for the CS Tool (Customer Success) workspace. The UI reproduces the team's
design in `../index.draft.html`; `src/styles/app.css` is that design's stylesheet, ported verbatim, so keep
class names in sync with it.

The UI talks **only** to the Workspace API (`/api/workspace/*`, `/api/auth/*`). It never calls HubSpot, TMS,
Google or any model directly — all data, case state, drafts and approvals live in `backend/`.

## Run locally

```bash
cd backend && AUTH_DEV_LOGIN=true npm run start:dev      # API on :3000
cd web && npm install && npm run dev                      # UI on :5173, proxies /api → :3000
```

Set `BACKEND_URL` if the API runs elsewhere (e.g. `BACKEND_URL=http://localhost:3100 npm run dev`).
With `AUTH_DEV_LOGIN=true` (never honoured in production) the sign-in screen shows **Local dev sign-in**;
otherwise it uses Google OIDC (`/api/auth/login`).

Or run everything behind nginx: `docker compose up --build` from the repo root, then open http://localhost:8080.

## Structure

```text
src/
  api/          typed Workspace API client (http.ts, workspace.ts), contract types, TanStack Query hooks
  app/          App routes, providers, cross-page UI state (filters, sort, open sections)
  components/   layout (top bar, global search), tags, toast, error banner, owner select
  features/
    home/       KPIs, tasks, summary, recent activity, playbook matrix + guide
    accounts/   table / board, saved views, filters and sorting (accountFilters.ts is pure + tested)
    record/     account record: properties, deals, approval, case history, tabs, assistant chat
    approvals/  review queue, draft review, rewrite / language / prompt, approve · hold · reject · close
    drafts/     shared draft actions (mutations + toasts), language bar, mail header
    sent/       send queue
    leader/     completion by owner, last week's expiry
  lib/          formatting helpers (Bangkok-time timeline stamps, initials, owners)
  styles/       app.css (design, verbatim) + extras.css (app-only additions)
```

## Scripts

`npm run dev` · `npm run build` · `npm test` · `npm run typecheck`
