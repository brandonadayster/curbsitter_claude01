-- D-025 revision: the City route-day lookup now runs once at stage 1, as soon
-- as the address is known, instead of being triggered by the stage-3 day
-- question. That lets an "I'm not sure" answer be resolved from data we
-- already hold rather than requiring a fresh check.
--
-- Kept separate from collection_day_check on purpose: this column is the raw
-- address-vs-City-zones result (no customer answer involved), while
-- collection_day_check is the combined customer-answer + City-data outcome
-- written later at stage 3. Two different lifecycles, two columns.
--
-- Additive and backward-compatible: existing drafts keep NULL, and the
-- stage-3 route falls back to a live lookup when this is absent.

alter table public.onboarding_drafts
  -- { status: 'found' | 'not_found' | 'geocode_failed',
  --   cityWeekday: number | null, checkedAt: timestamptz }
  add column city_lookup jsonb;

-- D-027: a signup that activates automatically can't be told it "passed
-- review" — no human reviewed it. notification_outbox.template_id is a FK, so
-- the template has to exist before finalize can queue it. Added here rather
-- than in seed data only, since seeds don't re-run on existing environments.
insert into public.notification_templates (id, channel, subject, version, active)
values ('service_confirmed', 'email', 'You are all set - CurbSitter service is active', '1', true)
on conflict (id) do nothing;
