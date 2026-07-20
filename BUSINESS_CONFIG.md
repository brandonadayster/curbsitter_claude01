# Business Configuration

This file is the human-readable mirror of values that must eventually live in typed application configuration and/or the database. Do not scatter these values through page components.

```yaml
business:
  name: CurbSitter
  legal_name: "OWNER_CONFIRM"
  market: "Prescott, Arizona"
  timezone: "America/Phoenix"
  primary_tagline: "Trash day, handled."
  service_line: "Bins out. Bins back. Photo-confirmed."
  phone: "OWNER_CONFIRM"
  email: "OWNER_CONFIRM"
  domain: "OWNER_CONFIRM"

plans:
  home:
    public_name: "CurbSitter Home"
    monthly_price_cents: 5900
    quarterly_price_cents: 15900
    quarterly_payment_method: "ach_debit_prepaid"
    max_bins: 3
    collection_coverage: "one_regular_day_per_week"
    includes_trash_and_recycling_within_covered_days: true
  complete:
    public_name: "CurbSitter Complete"
    monthly_price_cents: 8900
    quarterly_price_cents: 24000
    quarterly_payment_method: "ach_debit_prepaid"
    max_bins: 6
    collection_coverage: "all_regular_collection_days"
    includes_trash_and_recycling_within_covered_days: true

community_portfolio:
  pricing: "custom_quote"
  centralized_reporting: true
  multi_property_controls: true

one_time:
  trash_day_price_cents: 3900
  trash_day_included_bins: 3
  trash_day_requires_active_route: true
  trash_day_requires_capacity: true
  bulk_pickup_coordination_starting_cents: 4900
  bulk_physical_placement: "separate_review_and_quote"

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

referrals:
  advocate_credit_cents: 2000
  referred_customer_credit_cents: 2000
  qualifying_event: "first_paid_collection_cycle_completed"
  monthly_credit_cap_cents: "OWNER_CONFIRM"

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
- Any founder offer; standard plan and one-time prices above are locked.
- Referral credit cap and expiration.
- Insurance coverage and policy identifiers.
- Terms, privacy policy, ACH authorization, SMS consent language, and Arizona-specific legal review.
