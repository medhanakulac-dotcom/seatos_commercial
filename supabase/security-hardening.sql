-- Security hardening for the main site's Supabase project (public schema). Run in the Supabase SQL editor, in two steps.
--
-- What it fixes (found 2026-10-10):
--   1. allowed_users could be read by anyone with the public anon key: the whole list of staff emails and roles.
--   2. app_settings and contract_builder_settings allowed anyone on the internet to read AND change every row (the
--      proposal/contract pricing and company details were reachable with the anon key alone).
--   3. activity_logs accepted inserts from anyone (forged or spammed log entries, for any email).
--   4. anon and authenticated carried table privileges they never need (truncate, trigger, references).
--
-- STEP 1 is additive: it only creates functions, so the site keeps working. Run it BEFORE the new site version goes out.
-- STEP 2 removes the open policies. Run it AFTER the new site version is live (the new version signs requests with the
-- user's own session and checks the allow list through is_email_allowed(), not by reading the table).

-- ═══ STEP 1 ═══════════════════════════════════════════════════════════════════════════════════════════════════════
create or replace function public.is_email_allowed(p_email text) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.allowed_users where lower(email) = lower(trim(p_email)))
$$;

create or replace function public.is_allowed_user() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.allowed_users where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')))
$$;

create or replace function public.is_admin_user() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.allowed_users where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')) and role = 'admin')
$$;

revoke all on function public.is_email_allowed(text), public.is_allowed_user(), public.is_admin_user() from public;
grant execute on function public.is_email_allowed(text) to anon, authenticated;
grant execute on function public.is_allowed_user(), public.is_admin_user() to authenticated;

-- ═══ STEP 2 ═══════════════════════════════════════════════════════════════════════════════════════════════════════
begin;

-- allowed_users: a user sees only their own row, admins see and manage the list. The Operator Watch API keeps its own
-- read policy (role operator_watch), which is not touched.
drop policy if exists "Anon can read allowed_users" on public.allowed_users;
drop policy if exists "Authenticated users can read allowed_users" on public.allowed_users;
drop policy if exists "Admins can insert allowed_users" on public.allowed_users;
drop policy if exists "Admins can delete allowed_users" on public.allowed_users;
create policy "Users read own allowed_users row" on public.allowed_users for select to authenticated
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
create policy "Admins read allowed_users" on public.allowed_users for select to authenticated using (public.is_admin_user());
create policy "Admins insert allowed_users" on public.allowed_users for insert to authenticated with check (public.is_admin_user());
create policy "Admins delete allowed_users" on public.allowed_users for delete to authenticated using (public.is_admin_user());

-- activity_logs: only an allowed, signed-in user, and only under their own email. Admins keep reading everything
-- ("Admins can read all logs" is not touched).
drop policy if exists "Anon can insert logs" on public.activity_logs;
drop policy if exists "Users can insert own logs" on public.activity_logs;
create policy "Users insert own logs" on public.activity_logs for insert to authenticated
  with check (public.is_allowed_user() and lower(user_email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- app_settings and contract_builder_settings: staff on the allow list can read and save (the proposal and contract
-- tools save from the browser); only admins can delete. To let admins alone change them, require is_admin_user() on
-- the insert and update policies below.
drop policy if exists "Allow all access" on public.app_settings;
create policy "Allowed users read app_settings" on public.app_settings for select to authenticated using (public.is_allowed_user());
create policy "Allowed users insert app_settings" on public.app_settings for insert to authenticated with check (public.is_allowed_user());
create policy "Allowed users update app_settings" on public.app_settings for update to authenticated using (public.is_allowed_user()) with check (public.is_allowed_user());
create policy "Admins delete app_settings" on public.app_settings for delete to authenticated using (public.is_admin_user());

drop policy if exists "Allow all access" on public.contract_builder_settings;
drop policy if exists "contract_builder_allow_all" on public.contract_builder_settings;
create policy "Allowed users read contract_builder_settings" on public.contract_builder_settings for select to authenticated using (public.is_allowed_user());
create policy "Allowed users insert contract_builder_settings" on public.contract_builder_settings for insert to authenticated with check (public.is_allowed_user());
create policy "Allowed users update contract_builder_settings" on public.contract_builder_settings for update to authenticated using (public.is_allowed_user()) with check (public.is_allowed_user());
create policy "Admins delete contract_builder_settings" on public.contract_builder_settings for delete to authenticated using (public.is_admin_user());

-- Privileges: the signed-out role needs nothing in the public schema any more (the login check is a function), and
-- nobody needs truncate, trigger or references through the API.
revoke all on all tables in schema public from anon;
revoke truncate, trigger, references on all tables in schema public from authenticated;
alter default privileges in schema public revoke all on tables from anon;

commit;

-- ═══ CHECK (read-only) ════════════════════════════════════════════════════════════════════════════════════════════
-- Policies left in public, and what anon can still reach (expect: nothing but is_email_allowed):
-- select tablename, policyname, cmd, roles from pg_policies where schemaname = 'public' order by 1, 2;
-- select table_name, privilege_type from information_schema.role_table_grants where table_schema = 'public' and grantee = 'anon';
