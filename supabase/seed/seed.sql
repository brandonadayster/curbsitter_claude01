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
