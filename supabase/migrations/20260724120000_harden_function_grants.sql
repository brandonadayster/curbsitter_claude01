-- Harden functions flagged by the Supabase security advisor (lints 0011/0028/0029).
--
-- The RLS predicate helpers (is_account_member, is_account_manager,
-- can_view_property, is_assigned_runner_for_task, is_staff,
-- current_platform_role) intentionally remain EXECUTE-able by `authenticated`:
-- RLS policies invoke them during query evaluation, and they only ever reveal
-- the CALLER's own membership/role (auth.uid()), so REST exposure leaks nothing.
-- Moving them into a private (non-API) schema is a future hardening.

-- get_user_id_by_email is called only by server code as the service role.
-- The implicit PUBLIC execute grant let anon call it via /rest/v1/rpc and probe
-- whether an email has an account (enumeration). Remove PUBLIC; keep service_role.
revoke execute on function public.get_user_id_by_email(text) from public;
grant execute on function public.get_user_id_by_email(text) to service_role;

-- handle_new_user runs only via the on_auth_user_created trigger (trigger
-- execution does not require caller EXECUTE), so removing the PUBLIC grant is
-- safe and takes it off the public RPC surface.
revoke execute on function public.handle_new_user() from public;

-- Pin an explicit search_path on the updated-at trigger function (lint 0011).
alter function public.set_updated_at() set search_path = public;
