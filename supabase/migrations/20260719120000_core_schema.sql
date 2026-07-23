-- CurbSitter core schema (v1.1 baseline).
-- Implements DATA_MODEL.md. Supersedes the archived legacy prototype schema
-- (docs/archive/legacy-migrations); migration history was reset before first
-- production deploy, so this file is the new baseline.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums (DATA_MODEL.md "Required enums")
-- ---------------------------------------------------------------------------

create type public.account_role as enum ('owner', 'manager', 'caregiver', 'viewer');

create type public.platform_role as enum ('customer', 'runner', 'dispatcher', 'admin', 'support');

create type public.route_cell_state as enum (
  'research', 'waitlist', 'opening', 'active', 'capacity_full', 'premium_review', 'closed'
);

create type public.cycle_state as enum (
  'planned', 'rollout_scheduled', 'rolled_out', 'collection_pending', 'return_scheduled',
  'completed', 'completed_with_exception', 'delayed_by_hauler', 'blocked', 'cancelled'
);

create type public.task_type as enum ('rollout', 'return', 'recheck', 'home_watch', 'bulk_setout');

create type public.task_status as enum (
  'draft', 'scheduled', 'assigned', 'en_route', 'arrived', 'completed',
  'exception', 'retry_required', 'cancelled'
);

create type public.exception_type as enum (
  'access_blocked', 'bin_missing', 'bin_blocked', 'hauler_missed', 'partial_collection',
  'unsafe_condition', 'weather', 'animal', 'overweight_or_contaminated', 'damage',
  'schedule_mismatch', 'other'
);

create type public.billing_interval as enum ('monthly', 'quarterly');

create type public.subscription_status as enum (
  'pending_serviceability_review', 'active', 'paused', 'past_due', 'cancelled', 'declined'
);

create type public.eligibility_result as enum (
  'active_available', 'active_review_required', 'waitlist', 'capacity_full', 'unavailable'
);

-- ---------------------------------------------------------------------------
-- Shared trigger helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Identity and tenancy
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  platform_role public.platform_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', null))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  account_type text not null default 'individual'
    check (account_type in ('individual', 'household', 'hoa', 'portfolio')),
  stripe_customer_id text unique,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger accounts_updated_at before update on public.accounts
  for each row execute function public.set_updated_at();

create table public.account_members (
  account_id uuid not null references public.accounts (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role public.account_role not null default 'owner',
  receives_notifications boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (account_id, profile_id)
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  kind text not null
    check (kind in ('payer', 'service_recipient', 'caregiver', 'property_manager', 'hoa_contact')),
  full_name text not null,
  email text,
  phone text,
  sms_opt_in boolean not null default false,
  created_at timestamptz not null default now()
);

create index contacts_account_idx on public.contacts (account_id);

-- ---------------------------------------------------------------------------
-- Territory (needed before properties for the route-cell FK)
-- ---------------------------------------------------------------------------

create table public.service_areas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'city' check (kind in ('market', 'city', 'neighborhood')),
  parent_id uuid references public.service_areas (id),
  created_at timestamptz not null default now()
);

create table public.route_cells (
  id uuid primary key default gen_random_uuid(),
  service_area_id uuid references public.service_areas (id),
  name text not null,
  slug text not null unique,
  -- GeoJSON polygon or bounding description; vendor geometry kept as data, not PostGIS, for MVP.
  geometry jsonb,
  collection_days smallint[] not null default '{}',
  state public.route_cell_state not null default 'research',
  capacity integer,
  -- Configurable activation inputs (estimated contribution, drive time, etc.); admin decides.
  activation_inputs jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger route_cells_updated_at before update on public.route_cells
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Properties and access
-- ---------------------------------------------------------------------------

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  state text not null default 'AZ',
  postal_code text not null,
  place_id text,
  latitude double precision,
  longitude double precision,
  geocode_confidence text,
  route_cell_id uuid references public.route_cells (id),
  status text not null default 'pending_review'
    check (status in ('pending_review', 'active', 'paused', 'declined', 'closed')),
  timezone text not null default 'America/Phoenix',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger properties_updated_at before update on public.properties
  for each row execute function public.set_updated_at();

create index properties_account_idx on public.properties (account_id);
create index properties_route_cell_idx on public.properties (route_cell_id);

create table public.property_contacts (
  property_id uuid not null references public.properties (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  role text not null,
  primary key (property_id, contact_id, role)
);

create table public.bins (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  bin_type text not null default 'trash'
    check (bin_type in ('trash', 'recycling', 'organics', 'other')),
  size text,
  identifier text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index bins_property_idx on public.bins (property_id);

create table public.collection_schedules (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  provider text,
  waste_stream text not null default 'trash'
    check (waste_stream in ('trash', 'recycling', 'bulk', 'other')),
  weekday smallint check (weekday between 0 and 6),
  frequency text not null default 'weekly'
    check (frequency in ('weekly', 'biweekly', 'monthly', 'custom')),
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'verified', 'needs_review')),
  effective_start date,
  effective_end date,
  created_at timestamptz not null default now()
);

create index collection_schedules_property_idx on public.collection_schedules (property_id);

create table public.property_instructions (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null unique references public.properties (id) on delete cascade,
  bin_storage_location text,
  curb_placement_notes text,
  general_notes text,
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

-- Sensitive access data lives apart from ordinary notes (SECURITY_PRIVACY.md).
-- Payload is encrypted at the application layer before insert; this table is
-- never selected in broad list queries and has no customer-facing RLS policy.
create table public.property_access_secrets (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null unique references public.properties (id) on delete cascade,
  encrypted_payload text not null,
  secret_kinds text[] not null default '{}',
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

create table public.property_hazards (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  hazard_type text not null
    check (hazard_type in (
      'animal', 'steep_grade', 'long_driveway', 'stairs', 'gate', 'garage',
      'poor_lighting', 'ice', 'access_restriction', 'other'
    )),
  severity text not null default 'info' check (severity in ('info', 'caution', 'blocker')),
  notes text,
  created_at timestamptz not null default now()
);

create index property_hazards_property_idx on public.property_hazards (property_id);

-- ---------------------------------------------------------------------------
-- Catalog and billing
-- ---------------------------------------------------------------------------

-- Mirrors src/config/business.ts (typed source of truth). Seeded, not hardcoded in pages.
create table public.plans (
  id text primary key,
  public_name text not null,
  monthly_price_cents integer not null,
  quarterly_price_cents integer not null,
  max_bins integer not null,
  collection_coverage text not null,
  active boolean not null default true
);

create table public.services (
  id text primary key,
  public_name text not null,
  starting_price_cents integer not null,
  pricing_kind text not null default 'fixed' check (pricing_kind in ('fixed', 'starting_at', 'quote')),
  active boolean not null default true
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  plan_id text not null references public.plans (id),
  billing_interval public.billing_interval not null,
  status public.subscription_status not null default 'pending_serviceability_review',
  stripe_subscription_id text unique,
  current_period_end timestamptz,
  paused_at timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

create index subscriptions_account_idx on public.subscriptions (account_id);
create index subscriptions_property_idx on public.subscriptions (property_id);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  property_id uuid references public.properties (id) on delete set null,
  status text not null default 'requested'
    check (status in ('requested', 'quoted', 'approved', 'scheduled', 'completed', 'cancelled', 'declined')),
  requested_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create index orders_account_idx on public.orders (account_id);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  service_id text not null references public.services (id),
  quantity integer not null default 1 check (quantity > 0),
  approved_price_cents integer,
  scope text
);

create table public.credits (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  amount_cents integer not null,
  kind text not null default 'referral' check (kind in ('referral', 'manual', 'service_recovery')),
  status text not null default 'pending'
    check (status in ('pending', 'earned', 'applied', 'expired', 'reversed')),
  source_referral_id uuid,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger credits_updated_at before update on public.credits
  for each row execute function public.set_updated_at();

create index credits_account_idx on public.credits (account_id);

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'stripe',
  event_id text not null,
  event_type text not null,
  payload_hash text,
  status text not null default 'received'
    check (status in ('received', 'processed', 'failed', 'skipped')),
  error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, event_id)
);

-- ---------------------------------------------------------------------------
-- Acquisition: eligibility and waitlist
-- ---------------------------------------------------------------------------

create table public.eligibility_checks (
  id uuid primary key default gen_random_uuid(),
  submitted_address text not null,
  normalized_address text,
  postal_code text,
  place_id text,
  latitude double precision,
  longitude double precision,
  result public.eligibility_result not null,
  reason text,
  route_cell_id uuid references public.route_cells (id),
  referral_code text,
  created_at timestamptz not null default now()
);

create index eligibility_checks_cell_idx on public.eligibility_checks (route_cell_id);

create table public.waitlist_leads (
  id uuid primary key default gen_random_uuid(),
  eligibility_check_id uuid references public.eligibility_checks (id),
  email text not null unique,
  full_name text,
  phone text,
  postal_code text,
  route_cell_id uuid references public.route_cells (id),
  sms_opt_in boolean not null default false,
  marketing_opt_in boolean not null default false,
  referral_code_used text,
  share_code text not null unique default encode(gen_random_bytes(6), 'hex'),
  status text not null default 'waiting'
    check (status in ('waiting', 'invited', 'converted', 'unsubscribed')),
  created_at timestamptz not null default now()
);

create index waitlist_leads_cell_idx on public.waitlist_leads (route_cell_id);

-- ---------------------------------------------------------------------------
-- Operations: routes, cycles, tasks, proof
-- ---------------------------------------------------------------------------

create table public.routes (
  id uuid primary key default gen_random_uuid(),
  route_date date not null,
  task_type public.task_type not null,
  runner_id uuid references public.profiles (id),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'in_progress', 'completed', 'cancelled')),
  notes text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger routes_updated_at before update on public.routes
  for each row execute function public.set_updated_at();

create index routes_date_idx on public.routes (route_date);
create index routes_runner_idx on public.routes (runner_id);

create table public.collection_cycles (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  schedule_id uuid references public.collection_schedules (id) on delete set null,
  collection_date date not null,
  state public.cycle_state not null default 'planned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, schedule_id, collection_date)
);

create trigger collection_cycles_updated_at before update on public.collection_cycles
  for each row execute function public.set_updated_at();

create index collection_cycles_property_idx on public.collection_cycles (property_id);
create index collection_cycles_date_idx on public.collection_cycles (collection_date);

create table public.service_tasks (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  cycle_id uuid references public.collection_cycles (id) on delete cascade,
  order_id uuid references public.orders (id) on delete cascade,
  route_id uuid references public.routes (id) on delete set null,
  task_type public.task_type not null,
  sequence integer,
  window_start timestamptz,
  window_end timestamptz,
  status public.task_status not null default 'draft',
  assigned_runner_id uuid references public.profiles (id),
  completed_at timestamptz,
  completion_idempotency_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A task belongs to exactly one collection cycle or one order (DATA_MODEL.md).
  constraint service_tasks_cycle_or_order
    check (num_nonnulls(cycle_id, order_id) = 1)
);

create trigger service_tasks_updated_at before update on public.service_tasks
  for each row execute function public.set_updated_at();

create index service_tasks_cycle_idx on public.service_tasks (cycle_id);
create index service_tasks_route_idx on public.service_tasks (route_id);
create index service_tasks_runner_idx on public.service_tasks (assigned_runner_id, status);

-- Append-only state-transition log. Update/delete revoked in the RLS migration.
create table public.task_events (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.service_tasks (id) on delete cascade,
  event_type text not null,
  from_status public.task_status,
  to_status public.task_status,
  actor_id uuid references public.profiles (id),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index task_events_task_idx on public.task_events (task_id);

create table public.service_photos (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.service_tasks (id) on delete cascade,
  photo_type text not null
    check (photo_type in ('rollout_proof', 'return_proof', 'exception', 'reference')),
  -- Path within the private proof-photos bucket. Access only via short-lived signed URLs.
  object_path text not null unique,
  taken_at timestamptz,
  uploaded_by uuid references public.profiles (id),
  retention_expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index service_photos_task_idx on public.service_photos (task_id);

create table public.exceptions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.service_tasks (id) on delete cascade,
  cycle_id uuid references public.collection_cycles (id) on delete cascade,
  exception_type public.exception_type not null,
  severity text not null default 'normal' check (severity in ('normal', 'high', 'critical')),
  description text,
  customer_visible boolean not null default true,
  owner_id uuid references public.profiles (id),
  status text not null default 'open' check (status in ('open', 'in_review', 'resolved')),
  resolution text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index exceptions_task_idx on public.exceptions (task_id);
create index exceptions_status_idx on public.exceptions (status);

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.service_tasks (id) on delete set null,
  reporter_id uuid references public.profiles (id),
  severity text not null default 'normal' check (severity in ('normal', 'high', 'critical')),
  description text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Communications and growth
-- ---------------------------------------------------------------------------

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete set null,
  email text,
  channel text not null check (channel in ('email', 'sms')),
  purpose text not null check (purpose in ('transactional', 'marketing', 'photo', 'terms')),
  language_version text not null,
  source text not null,
  granted boolean not null default true,
  created_at timestamptz not null default now()
);

create index consents_profile_idx on public.consents (profile_id);
create index consents_email_idx on public.consents (email);

create table public.notification_templates (
  id text primary key,
  channel text not null check (channel in ('email', 'sms')),
  subject text,
  version text not null default '1',
  active boolean not null default true
);

create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  template_id text references public.notification_templates (id),
  channel text not null check (channel in ('email', 'sms')),
  recipient text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'sending', 'sent', 'failed', 'cancelled')),
  attempts integer not null default 0,
  next_attempt_at timestamptz,
  provider_message_id text,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index notification_outbox_status_idx on public.notification_outbox (status, next_attempt_at);

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.accounts (id) on delete set null,
  opened_by uuid references public.profiles (id),
  subject text not null,
  body text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger support_tickets_updated_at before update on public.support_tickets
  for each row execute function public.set_updated_at();

create table public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  advocate_account_id uuid references public.accounts (id) on delete cascade,
  advocate_lead_id uuid references public.waitlist_leads (id) on delete cascade,
  route_cell_id uuid references public.route_cells (id),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint referral_codes_one_advocate
    check (num_nonnulls(advocate_account_id, advocate_lead_id) = 1)
);

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referral_code_id uuid not null references public.referral_codes (id) on delete cascade,
  referred_lead_id uuid references public.waitlist_leads (id),
  referred_account_id uuid references public.accounts (id),
  qualifying_status text not null default 'pending'
    check (qualifying_status in ('pending', 'qualified', 'reversed')),
  fraud_status text not null default 'none'
    check (fraud_status in ('none', 'review', 'confirmed_fraud')),
  qualified_at timestamptz,
  created_at timestamptz not null default now(),
  -- A referred account can qualify at most once (DATA_MODEL.md constraint).
  unique (referred_account_id)
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id),
  action text not null,
  entity text not null,
  entity_id text,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_entity_idx on public.audit_log (entity, entity_id);
