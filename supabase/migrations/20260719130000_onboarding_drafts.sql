-- Short-lived onboarding drafts (APP_FLOW.md four-stage onboarding; created
-- only after consent). Server-only: no client grants or policies. A retention
-- job clears expired drafts.

create table public.onboarding_drafts (
  id uuid primary key default gen_random_uuid(),
  -- Capability token held by the (possibly anonymous) applicant's browser.
  client_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  eligibility_check_id uuid references public.eligibility_checks (id),
  current_stage smallint not null default 1 check (current_stage between 1 and 4),
  stage1 jsonb,
  stage2 jsonb,
  stage3 jsonb,
  -- Secure access details are held separately from ordinary stage data so
  -- finalize can route them straight into property_access_secrets.
  access_secrets jsonb,
  status text not null default 'draft'
    check (status in ('draft', 'checkout_started', 'finalized', 'expired', 'abandoned')),
  stripe_checkout_session_id text unique,
  finalized_account_id uuid references public.accounts (id),
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger onboarding_drafts_updated_at before update on public.onboarding_drafts
  for each row execute function public.set_updated_at();

alter table public.onboarding_drafts enable row level security;

-- Server-only helper: resolve an auth user id by email so onboarding finalize
-- stays idempotent when the payer already has an account. Not granted to
-- client roles.
create or replace function public.get_user_id_by_email(target_email text)
returns uuid
language sql
security definer set search_path = public
as $$
  select id from auth.users where lower(email) = lower(target_email) limit 1;
$$;

revoke execute on function public.get_user_id_by_email(text) from anon, authenticated;
