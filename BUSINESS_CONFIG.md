# Business Configuration

This file is the human-readable mirror of values that must eventually live in typed application configuration and/or the database. Do not scatter these values through page components.

```yaml
business:
  name: CurbSitter
  legal_name: "CurbSitter, LLC"
  market: "Prescott, Arizona"
  timezone: "America/Phoenix"
  primary_tagline: "Trash day, handled."
  service_line: "Bins out. Bins back. Photo-confirmed."
  phone: "(520) 225-9713"
  email: "support@curbsitter.com"
  domain: "curbsitter.com"

# Pricing revised 2026-07-27 (D-004/D-012/D-023). Quarterly is a discounted
# per-month rate shown via the pricing toggle; the customer is charged the full
# quarterly_price_cents once every three months (payable by card or ACH).
plans:
  home:
    public_name: "CurbSitter Home"
    monthly_price_cents: 6500
    quarterly_price_cents: 16500   # $55/mo billed quarterly
    quarterly_payment_method: "card_or_ach_prepaid"
    max_bins: 3
    collection_coverage: "one_regular_day_per_week"
    includes_trash_and_recycling_within_covered_days: true
  complete:
    public_name: "CurbSitter Complete"
    monthly_price_cents: 8500
    quarterly_price_cents: 22500   # $75/mo billed quarterly
    quarterly_payment_method: "card_or_ach_prepaid"
    max_bins: 6
    collection_coverage: "all_regular_collection_days"
    includes_trash_and_recycling_within_covered_days: true

# Formerly "Community & Portfolio"; renamed to CurbSitter Enterprise (D-023).
community_portfolio:
  public_name: "CurbSitter Enterprise"
  pricing: "custom_quote"
  centralized_reporting: true
  multi_property_controls: true

# Formerly "One-Time Trash Day"; renamed to CurbSitter onDemand (D-023).
# Bulk Pickup Coordination removed (D-007 retired 2026-07-27).
one_time:
  trash_day_public_name: "CurbSitter onDemand"
  trash_day_price_cents: 2500
  trash_day_included_bins: 3
  trash_day_requires_active_route: true
  trash_day_requires_capacity: true

included_service:
  photo_confirmation_every_visit: true
  real_time_exception_reporting: true
  holiday_schedule_monitoring: true
  normal_hoa_timing_instructions: true
  minor_javelina_wind_reset_during_scheduled_visit: true
  customer_dashboard_and_history: true
  no_long_term_contract: true
  pause_or_cancel_future_renewal_online: true

excluded_public_launch_services:
  - home_watch
  - host_shield
  - residential_pet_waste
  - junk_hauling
  - waste_transport

service_windows:
  rollout_start_local: "17:00"
  rollout_end_local: "22:00"
  return_target: "after_confirmed_collection_same_day"
  return_fallback: "published_next_day_window"

# Reverted 2026-07-31 (D-014): back to 2000/2000 ($20/$20); was 1000/1000
# ($10/$10) from 2026-07-27 to 2026-07-31 — the lower amount had less pull.
referrals:
  advocate_credit_cents: 2000
  referred_customer_credit_cents: 2000
  qualifying_event: "first_paid_collection_cycle_completed"
  monthly_credit_cap_cents: "no cap"

notifications:
  email_default: true
  sms_requires_explicit_opt_in: true
  marketing_sms_default: false

storage:
  proof_bucket_visibility: private
  signed_url_ttl_seconds: 3600
  default_photo_retention_days: 180
  access_data_retention: "active_account_plus_90_days"

service_area:
  mode: "route_cell_and_address"
  zip_only_validation_prohibited: true
  public_active_cells: []
  public_waitlist_cells: []
```

## Publication locks

The following must be confirmed before production launch:

- Legal business name and entity details.
- Public phone, email, and domain.
- Exact active route cells and start dates.
- Any founder offer; standard plan and one-time prices above are locked (revised 2026-07-27).
- Referral credit cap and expiration.
- Insurance coverage and policy identifiers.
- Terms, privacy policy, ACH authorization, SMS consent language, and Arizona-specific legal review.
