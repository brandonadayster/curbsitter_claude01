-- ============================================================================
-- LOCAL / CI DEVELOPMENT SEED ONLY.  DO NOT APPLY TO A HOSTED PROJECT.
-- This file creates dev sign-in users with a KNOWN PASSWORD (see bottom).
-- Applying it to production would create a known-password admin backdoor.
-- For a hosted project use supabase/seed/production.sql instead, and never run
-- `supabase db reset --linked` (which would run this file against the remote).
-- ============================================================================
--
-- Synthetic development seed. No customer data, no fabricated public claims.
-- Plan/service prices mirror src/config/business.ts (locked 2026-07-13 pricing).

insert into public.plans (id, public_name, monthly_price_cents, quarterly_price_cents, max_bins, collection_coverage, active)
values
  ('home', 'CurbSitter Home', 5900, 15900, 3, 'one_regular_day_per_week', true),
  ('complete', 'CurbSitter Complete', 8900, 24000, 6, 'all_regular_collection_days', true)
on conflict (id) do nothing;

insert into public.services (id, public_name, starting_price_cents, pricing_kind, active)
values
  ('one_time_trash_day', 'One-Time Trash Day', 3900, 'fixed', true),
  ('bulk_pickup_coordination', 'Bulk Pickup Coordination', 4900, 'starting_at', true),
  ('bulk_physical_placement', 'Bulk Physical Placement', 0, 'quote', true),
  ('community_portfolio', 'Community & Portfolio', 0, 'quote', true)
on conflict (id) do nothing;

insert into public.service_areas (id, name, kind)
values
  ('c0a80000-0000-4000-8000-000000000001', 'Prescott, AZ', 'market')
on conflict (id) do nothing;

-- Route cells start in research/waitlist. Activation is an administrator
-- decision (OWNER_CONFIRM); none are active by default.
insert into public.route_cells (id, service_area_id, name, slug, state, collection_days, notes)
values
  ('c0a80000-0000-4000-8000-000000000101', 'c0a80000-0000-4000-8000-000000000001',
   'Prescott Lakes', 'prescott-lakes', 'research', '{}', 'Sales-research list; not a coverage claim.'),
  ('c0a80000-0000-4000-8000-000000000102', 'c0a80000-0000-4000-8000-000000000001',
   'StoneRidge', 'stoneridge', 'research', '{}', 'Sales-research list; not a coverage claim.'),
  ('c0a80000-0000-4000-8000-000000000103', 'c0a80000-0000-4000-8000-000000000001',
   'Yavapai Hills', 'yavapai-hills', 'research', '{}', 'Sales-research list; not a coverage claim.')
on conflict (id) do nothing;

insert into public.notification_templates (id, channel, subject, version, active)
values
  ('welcome_pending_review', 'email', 'Welcome to CurbSitter - property review in progress', '1', true),
  ('review_approved', 'email', 'Your CurbSitter service is approved', '1', true),
  ('service_scheduled', 'email', 'Your trash-day service is scheduled', '1', true),
  ('rollout_completed', 'email', 'Bins out - photo confirmed', '1', true),
  ('return_completed', 'email', 'Bins back - photo confirmed', '1', true),
  ('exception_reported', 'email', 'A service exception needs your attention', '1', true),
  ('hauler_delay', 'email', 'Collection delayed by your hauler', '1', true),
  ('payment_issue', 'email', 'Payment issue on your CurbSitter account', '1', true),
  ('waitlist_joined', 'email', 'You are on the CurbSitter waitlist', '1', true),
  ('route_opening', 'email', 'CurbSitter is opening in your area', '1', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Synthetic dev sign-in users (LOCAL DEVELOPMENT ONLY — never ship this seed
-- to a hosted environment). Password for all three: devpassword123
-- ---------------------------------------------------------------------------

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new)
values
  ('d0000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@curbsitter.test',    crypt('devpassword123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Dev Admin"}',    now(), now(), '', '', '', ''),
  ('d0000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'runner@curbsitter.test',   crypt('devpassword123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Dev Runner"}',   now(), now(), '', '', '', ''),
  ('d0000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'customer@curbsitter.test', crypt('devpassword123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Dev Customer"}', now(), now(), '', '', '', '')
on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users u
where u.email in ('admin@curbsitter.test', 'runner@curbsitter.test', 'customer@curbsitter.test')
  and not exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email');

update public.profiles set platform_role = 'admin'  where id = 'd0000000-0000-4000-8000-000000000001';
update public.profiles set platform_role = 'runner' where id = 'd0000000-0000-4000-8000-000000000002';
