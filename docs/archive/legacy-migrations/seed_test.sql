-- Seed script to bypass Auth and FK constraints
-- 1. Insert dummy user in auth.users
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  is_anonymous
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'e7f223f2-a25e-4c8d-8a62-a5e22728f118',
  'authenticated',
  'authenticated',
  'dummy_user@curbsitter.app',
  '$2a$10$7/O2C6yR2q/6JvT1e.Zpve7b848VjS/g74W3wT2t2.dE0r3O8v0m.',
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  false,
  false
) ON CONFLICT (id) DO NOTHING;

-- 2. Insert dummy user in public.users
INSERT INTO public.users (
  id,
  role,
  first_name,
  last_name,
  phone,
  email,
  created_at
) VALUES (
  'e7f223f2-a25e-4c8d-8a62-a5e22728f118',
  'customer',
  'John',
  'Doe',
  '555-123-4567',
  'dummy_user@curbsitter.app',
  now()
) ON CONFLICT (id) DO NOTHING;

-- 3. Insert property in public.properties
INSERT INTO public.properties (
  id,
  user_id,
  address,
  city,
  zip_code,
  property_type,
  bin_location,
  is_first_visit,
  created_at
) VALUES (
  'b7fbcd67-7590-4d57-b08e-32ef216f9f30',
  'e7f223f2-a25e-4c8d-8a62-a5e22728f118',
  '123 Concierge Way',
  'Prescott',
  '86301',
  'main',
  'Backyard',
  true,
  now()
) ON CONFLICT (id) DO NOTHING;

-- 4. Insert active subscription in public.subscriptions
INSERT INTO public.subscriptions (
  id,
  property_id,
  tier,
  billing_cycle,
  payment_method,
  status,
  created_at
) VALUES (
  'c8d20392-124b-4f05-950c-99e8d47b0e12',
  'b7fbcd67-7590-4d57-b08e-32ef216f9f30',
  'premium',
  'monthly',
  'credit_card',
  'active',
  now()
) ON CONFLICT (id) DO NOTHING;

-- 5. Insert service in public.on_demand_services
INSERT INTO public.on_demand_services (
  id,
  name,
  description,
  base_price_cents,
  requires_hoa,
  is_active,
  created_at
) VALUES (
  '5f89e2b1-5dfa-45c1-9a74-cf4e8a609d1c',
  'Order On-Demand Rollout',
  'Premium on-demand waste bin rollout concierge service',
  2500,
  false,
  true,
  now()
) ON CONFLICT (id) DO NOTHING;
