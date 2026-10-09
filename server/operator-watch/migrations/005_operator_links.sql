-- Which SeatOS (TMS) operator a workspace account is, resolved once so agents never look it up by name.
--   status 'needs_confirmation': several or inexact matches, `candidates` holds up to 10 for a person to pick from.
--   source 'human' links are never re-resolved automatically.
create table operator_links (
  account_id        text primary key,
  status            text not null check (status in ('linked', 'needs_confirmation', 'not_found')),
  tms_operator_id   integer,
  tms_operator_name text,
  source            text check (source in ('lookup', 'human')),
  candidates        jsonb not null default '[]',
  resolved_at       timestamptz not null,
  confirmed_by      text
);
