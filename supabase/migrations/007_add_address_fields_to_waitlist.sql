-- Add address and coordinates to waitlist table
alter table public.waitlist
  add column if not exists address text,
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

