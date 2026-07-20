-- RLS smoke test (Phase 1 exit criteria):
--   * no cross-account leakage for customers,
--   * runners see only assigned tasks,
--   * access secrets and acquisition tables are invisible to clients,
--   * no public storage bucket exists.
-- Runs inside a transaction and rolls back. Execute with ON_ERROR_STOP=1.

begin;

-- --- fixtures (as superuser) ------------------------------------------------

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-4000-8000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'customer-a@test.local', 'x', now(), '{}', '{"full_name":"Customer A"}'),
  ('00000000-0000-4000-8000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'customer-b@test.local', 'x', now(), '{}', '{"full_name":"Customer B"}'),
  ('00000000-0000-4000-8000-00000000000c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'runner-c@test.local', 'x', now(), '{}', '{"full_name":"Runner C"}');

update public.profiles set platform_role = 'runner'
where id = '00000000-0000-4000-8000-00000000000c';

insert into public.accounts (id, name, created_by) values
  ('00000000-0000-4000-8000-0000000000a1', 'Account A', '00000000-0000-4000-8000-00000000000a'),
  ('00000000-0000-4000-8000-0000000000b1', 'Account B', '00000000-0000-4000-8000-00000000000b');

insert into public.account_members (account_id, profile_id, role) values
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-00000000000a', 'owner'),
  ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-00000000000b', 'owner');

insert into public.properties (id, account_id, address_line1, city, postal_code) values
  ('00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-0000000000a1', '100 A St', 'Prescott', '86301'),
  ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000b1', '200 B St', 'Prescott', '86303');

insert into public.property_access_secrets (property_id, encrypted_payload, secret_kinds) values
  ('00000000-0000-4000-8000-0000000000a2', 'ciphertext-a', '{gate}'),
  ('00000000-0000-4000-8000-0000000000b2', 'ciphertext-b', '{garage}');

insert into public.collection_schedules (id, property_id, weekday) values
  ('00000000-0000-4000-8000-0000000000a3', '00000000-0000-4000-8000-0000000000a2', 2),
  ('00000000-0000-4000-8000-0000000000b3', '00000000-0000-4000-8000-0000000000b2', 4);

insert into public.collection_cycles (id, property_id, schedule_id, collection_date) values
  ('00000000-0000-4000-8000-0000000000a4', '00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-0000000000a3', current_date + 1),
  ('00000000-0000-4000-8000-0000000000b4', '00000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000b3', current_date + 1);

-- Runner C is assigned only to property A's rollout task.
insert into public.service_tasks (id, property_id, cycle_id, task_type, status, assigned_runner_id) values
  ('00000000-0000-4000-8000-0000000000a5', '00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-0000000000a4', 'rollout', 'assigned', '00000000-0000-4000-8000-00000000000c'),
  ('00000000-0000-4000-8000-0000000000b5', '00000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000b4', 'rollout', 'scheduled', null);

insert into public.waitlist_leads (email, full_name) values ('lead@test.local', 'Lead');

-- --- assertions as Customer A ----------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);

do $$
begin
  if (select count(*) from public.properties) <> 1 then
    raise exception 'FAIL: customer A should see exactly their own property, saw %',
      (select count(*) from public.properties);
  end if;
  if exists (select 1 from public.properties where id = '00000000-0000-4000-8000-0000000000b2') then
    raise exception 'FAIL: customer A can see customer B property';
  end if;
  begin
    perform count(*) from public.property_access_secrets;
    raise exception 'FAIL: customer can read property_access_secrets';
  exception when insufficient_privilege then null;
  end;
  begin
    perform count(*) from public.waitlist_leads;
    raise exception 'FAIL: customer can read waitlist_leads';
  exception when insufficient_privilege then null;
  end;
  if (select count(*) from public.collection_cycles) <> 1 then
    raise exception 'FAIL: customer A cycle visibility incorrect';
  end if;
  if (select count(*) from public.accounts) <> 1 then
    raise exception 'FAIL: customer A account visibility incorrect';
  end if;
end $$;

-- Customer A cannot update customer B's account.
update public.accounts set name = 'hacked' where id = '00000000-0000-4000-8000-0000000000b1';
do $$
begin
  if exists (select 1 from public.accounts where name = 'hacked') then
    raise exception 'FAIL: cross-account update succeeded';
  end if;
end $$;

-- --- assertions as Runner C -------------------------------------------------

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000c","role":"authenticated"}', true);

do $$
begin
  if (select count(*) from public.service_tasks) <> 1 then
    raise exception 'FAIL: runner should see only assigned task, saw %',
      (select count(*) from public.service_tasks);
  end if;
  if exists (select 1 from public.service_tasks where id = '00000000-0000-4000-8000-0000000000b5') then
    raise exception 'FAIL: runner can see unassigned task';
  end if;
  begin
    perform count(*) from public.property_access_secrets;
    raise exception 'FAIL: runner can read property_access_secrets directly';
  exception when insufficient_privilege then null;
  end;
  if (select count(*) from public.properties) <> 0 then
    raise exception 'FAIL: runner can browse customer properties directly';
  end if;
end $$;

-- --- storage assertion (as superuser again) ---------------------------------

reset role;

do $$
begin
  if exists (select 1 from storage.buckets where public) then
    raise exception 'FAIL: a public storage bucket exists';
  end if;
  if not exists (select 1 from storage.buckets where id = 'proof-photos' and not public) then
    raise exception 'FAIL: private proof-photos bucket missing';
  end if;
end $$;

select 'RLS smoke test passed' as result;

rollback;
