-- Support for D-025 (automated collection-day verification against the City
-- of Prescott ArcGIS lookup) and D-027 (auto-approval for clean signups).
--
-- Additive and backward-compatible: existing collection_schedules rows keep
-- NULL for both new columns and read as "unverified", the same as today.

alter table public.collection_schedules
  -- Distinguishes *why* a row needs review — a customer who said "not sure"
  -- and a customer who overrode a real City mismatch are different admin
  -- situations, and the review UI couldn't tell them apart before this.
  add column needs_review_reason text
    check (needs_review_reason in ('customer_unsure', 'city_mismatch')),
  -- The City's stated day whenever a zone match existed for the address.
  -- Equal to weekday when verified; different from weekday only when
  -- needs_review_reason = 'city_mismatch'.
  add column city_weekday smallint check (city_weekday between 0 and 6);

alter table public.onboarding_drafts
  -- Raw outcome of the stage-3 collection-day verification call: status
  -- ('match' | 'mismatch_confirmed' | 'no_zone_data' | 'geocode_failed'),
  -- customerWeekday, cityWeekday, checkedAt. Stored once at check time and
  -- read once by finalizeOnboardingDraft, so finalize never re-derives (and
  -- risks a different) result from a possibly-stale geocode.
  add column collection_day_check jsonb,
  -- Raw outcome of the stage-1 residential/commercial parcel check: status
  -- ('residential' | 'flagged' | 'check_failed'), usageType, usageDesc,
  -- checkedAt.
  add column commercial_check jsonb;
