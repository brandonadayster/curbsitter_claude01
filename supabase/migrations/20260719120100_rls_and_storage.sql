-- RLS, authorization helpers, and private storage (SECURITY_PRIVACY.md, D-009).
--
-- Model:
--   * Customers/caregivers use the anon/authenticated key; RLS scopes them to
--     their accounts and properties.
--   * Runners use RLS scoped to assigned tasks/routes only.
--   * Admin/dispatcher/support surfaces and all acquisition writes go through
--     server code using the service role plus server-side authorization
--     (service role bypasses RLS by design).
--   * property_access_secrets, incidents, webhook_events, notification_outbox,
--     eligibility_checks, waitlist_leads, and audit_log expose NO client
--     policies: default-deny, server-only.
--   * Storage buckets are private with no client object policies; all object
--     access is short-lived signed URLs minted server-side after authorization.

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------

create or replace function public.current_platform_role()
returns public.platform_role
language sql
stable
security definer set search_path = public
as $$
  select platform_role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce(public.current_platform_role() in ('admin', 'dispatcher', 'support'), false);
$$;

create or replace function public.is_account_member(target_account uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.account_members m
    where m.account_id = target_account and m.profile_id = auth.uid()
  );
$$;

create or replace function public.is_account_manager(target_account uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.account_members m
    where m.account_id = target_account
      and m.profile_id = auth.uid()
      and m.role in ('owner', 'manager')
  );
$$;

create or replace function public.can_view_property(target_property uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.properties p
    where p.id = target_property and public.is_account_member(p.account_id)
  );
$$;

create or replace function public.is_assigned_runner_for_task(target_task uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.service_tasks t
    where t.id = target_task and t.assigned_runner_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere (default deny)
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.account_members enable row level security;
alter table public.contacts enable row level security;
alter table public.service_areas enable row level security;
alter table public.route_cells enable row level security;
alter table public.properties enable row level security;
alter table public.property_contacts enable row level security;
alter table public.bins enable row level security;
alter table public.collection_schedules enable row level security;
alter table public.property_instructions enable row level security;
alter table public.property_access_secrets enable row level security;
alter table public.property_hazards enable row level security;
alter table public.plans enable row level security;
alter table public.services enable row level security;
alter table public.subscriptions enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.credits enable row level security;
alter table public.webhook_events enable row level security;
alter table public.eligibility_checks enable row level security;
alter table public.waitlist_leads enable row level security;
alter table public.routes enable row level security;
alter table public.collection_cycles enable row level security;
alter table public.service_tasks enable row level security;
alter table public.task_events enable row level security;
alter table public.service_photos enable row level security;
alter table public.exceptions enable row level security;
alter table public.incidents enable row level security;
alter table public.consents enable row level security;
alter table public.notification_templates enable row level security;
alter table public.notification_outbox enable row level security;
alter table public.support_tickets enable row level security;
alter table public.referral_codes enable row level security;
alter table public.referrals enable row level security;
alter table public.audit_log enable row level security;

-- ---------------------------------------------------------------------------
-- Explicit verb grants (this Postgres image grants no DML to client roles by
-- default). RLS gates rows; these grants gate verbs. Tables absent from this
-- list (access secrets, webhook events, acquisition, outbox, audit, incident
-- reads) stay completely inaccessible to client roles.
-- ---------------------------------------------------------------------------

grant select on public.plans, public.services, public.route_cells, public.service_areas
  to anon, authenticated;

grant select, update on public.profiles, public.accounts, public.properties,
  public.routes, public.service_tasks to authenticated;

grant select on public.account_members, public.property_contacts,
  public.collection_schedules, public.property_hazards, public.subscriptions,
  public.orders, public.order_items, public.credits, public.collection_cycles,
  public.consents, public.referral_codes, public.referrals to authenticated;

grant select, insert, update, delete on public.contacts, public.bins,
  public.property_instructions to authenticated;

-- Append-only client tables: no update/delete verb at all.
grant select, insert on public.task_events, public.service_photos,
  public.exceptions, public.support_tickets to authenticated;

grant insert on public.incidents to authenticated;

-- ---------------------------------------------------------------------------
-- Public catalog reads
-- ---------------------------------------------------------------------------

create policy "plans are publicly readable"
  on public.plans for select
  using (active);

create policy "services are publicly readable"
  on public.services for select
  using (active);

-- Route-cell availability powers the truthful service-area map/legend.
create policy "route cells are publicly readable"
  on public.route_cells for select
  using (true);

create policy "service areas are publicly readable"
  on public.service_areas for select
  using (true);

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------

create policy "read own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "update own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid() and platform_role = 'customer');

create policy "members read their accounts"
  on public.accounts for select
  using (public.is_account_member(id));

create policy "managers update their accounts"
  on public.accounts for update
  using (public.is_account_manager(id))
  with check (public.is_account_manager(id));

create policy "members read account membership"
  on public.account_members for select
  using (profile_id = auth.uid() or public.is_account_member(account_id));

create policy "members read account contacts"
  on public.contacts for select
  using (public.is_account_member(account_id));

create policy "managers write account contacts"
  on public.contacts for all
  using (public.is_account_manager(account_id))
  with check (public.is_account_manager(account_id));

-- ---------------------------------------------------------------------------
-- Properties and related customer data
-- ---------------------------------------------------------------------------

create policy "members read their properties"
  on public.properties for select
  using (public.is_account_member(account_id));

create policy "managers update their properties"
  on public.properties for update
  using (public.is_account_manager(account_id))
  with check (public.is_account_manager(account_id));

create policy "members read property contacts"
  on public.property_contacts for select
  using (public.can_view_property(property_id));

create policy "members read bins"
  on public.bins for select
  using (public.can_view_property(property_id));

create policy "managers write bins"
  on public.bins for all
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_id and public.is_account_manager(p.account_id)
    )
  )
  with check (
    exists (
      select 1 from public.properties p
      where p.id = property_id and public.is_account_manager(p.account_id)
    )
  );

create policy "members read schedules"
  on public.collection_schedules for select
  using (public.can_view_property(property_id));

create policy "members read instructions"
  on public.property_instructions for select
  using (public.can_view_property(property_id));

create policy "managers write instructions"
  on public.property_instructions for all
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_id and public.is_account_manager(p.account_id)
    )
  )
  with check (
    exists (
      select 1 from public.properties p
      where p.id = property_id and public.is_account_manager(p.account_id)
    )
  );

create policy "members read hazards"
  on public.property_hazards for select
  using (public.can_view_property(property_id));

-- property_access_secrets: intentionally NO policies.
-- Reveal/edit happens only through the step-up server route (service role).

-- ---------------------------------------------------------------------------
-- Billing
-- ---------------------------------------------------------------------------

create policy "members read subscriptions"
  on public.subscriptions for select
  using (public.is_account_member(account_id));

create policy "members read orders"
  on public.orders for select
  using (public.is_account_member(account_id));

create policy "members read order items"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and public.is_account_member(o.account_id)
    )
  );

create policy "members read credits"
  on public.credits for select
  using (public.is_account_member(account_id));

-- ---------------------------------------------------------------------------
-- Operations: customer visibility + runner least privilege
-- ---------------------------------------------------------------------------

create policy "members read their cycles"
  on public.collection_cycles for select
  using (public.can_view_property(property_id));

create policy "members and runners read tasks"
  on public.service_tasks for select
  using (
    public.can_view_property(property_id)
    or assigned_runner_id = auth.uid()
  );

create policy "assigned runner updates task status"
  on public.service_tasks for update
  using (assigned_runner_id = auth.uid())
  with check (assigned_runner_id = auth.uid());

create policy "runners read their routes"
  on public.routes for select
  using (runner_id = auth.uid());

create policy "runners update their routes"
  on public.routes for update
  using (runner_id = auth.uid())
  with check (runner_id = auth.uid());

create policy "members and assigned runner read task events"
  on public.task_events for select
  using (
    public.is_assigned_runner_for_task(task_id)
    or exists (
      select 1 from public.service_tasks t
      where t.id = task_id and public.can_view_property(t.property_id)
    )
  );

create policy "assigned runner appends task events"
  on public.task_events for insert
  with check (
    actor_id = auth.uid() and public.is_assigned_runner_for_task(task_id)
  );

create policy "members and assigned runner read photo records"
  on public.service_photos for select
  using (
    public.is_assigned_runner_for_task(task_id)
    or exists (
      select 1 from public.service_tasks t
      where t.id = task_id and public.can_view_property(t.property_id)
    )
  );

create policy "assigned runner records photos"
  on public.service_photos for insert
  with check (
    uploaded_by = auth.uid() and public.is_assigned_runner_for_task(task_id)
  );

create policy "members read customer-visible exceptions"
  on public.exceptions for select
  using (
    (
      customer_visible
      and exists (
        select 1 from public.service_tasks t
        where t.id = task_id and public.can_view_property(t.property_id)
      )
    )
    or public.is_assigned_runner_for_task(task_id)
  );

create policy "assigned runner records exceptions"
  on public.exceptions for insert
  with check (public.is_assigned_runner_for_task(task_id));

create policy "runners file incidents"
  on public.incidents for insert
  with check (reporter_id = auth.uid());
-- incidents: no client select policy; restricted review is server-side.

-- ---------------------------------------------------------------------------
-- Communications and growth
-- ---------------------------------------------------------------------------

create policy "read own consents"
  on public.consents for select
  using (profile_id = auth.uid());

create policy "members read and open support tickets"
  on public.support_tickets for select
  using (opened_by = auth.uid() or (account_id is not null and public.is_account_member(account_id)));

create policy "customers open support tickets"
  on public.support_tickets for insert
  with check (opened_by = auth.uid());

create policy "advocates read their referral codes"
  on public.referral_codes for select
  using (advocate_account_id is not null and public.is_account_member(advocate_account_id));

create policy "advocates read their referrals"
  on public.referrals for select
  using (
    exists (
      select 1 from public.referral_codes rc
      where rc.id = referral_code_id
        and rc.advocate_account_id is not null
        and public.is_account_member(rc.advocate_account_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Private storage buckets (D-009: no public proof bucket, ever)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values
  ('proof-photos', 'proof-photos', false),
  ('property-reference', 'property-reference', false)
on conflict (id) do update set public = false;

-- No storage.objects policies: clients never read or write objects directly.
-- Uploads use server-issued signed upload URLs; reads use short-lived signed
-- URLs minted after RLS-checked authorization (signed_url_ttl_seconds config).
