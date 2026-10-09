-- Authentication & authorization: users (one role each), operator memberships, audit trail.

create table auth_users (
  id            text primary key,
  -- Google's immutable account identifier; never reused for another person.
  subject       text not null unique,
  email         text not null,
  role          text not null check (role in ('admin', 'analyst', 'viewer')),
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  last_login_at timestamptz
);

create unique index auth_users_email_key on auth_users (lower(email));
create index auth_users_role_idx on auth_users (role) where active;

-- Operator-scoped permissions (e.g. dashboard:read) require a membership unless the role spans all operators.
create table auth_operator_memberships (
  user_id     text not null references auth_users (id) on delete cascade,
  operator_id text not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, operator_id)
);

-- Append-only. No foreign key on purpose: the trail must outlive any user row.
create table auth_audit_events (
  id          bigserial primary key,
  user_id     text not null,
  action      text not null,
  operator_id text,
  detail      jsonb,
  at          timestamptz not null default now()
);

create index auth_audit_events_user_idx on auth_audit_events (user_id, at desc);
create index auth_audit_events_action_idx on auth_audit_events (action, at desc);
