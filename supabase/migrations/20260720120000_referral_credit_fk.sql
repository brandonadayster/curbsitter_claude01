-- Link referral credits to their source referral so PostgREST can embed the
-- relationship and referential integrity is enforced (P6-01).
alter table public.credits
  add constraint credits_source_referral_id_fkey
  foreign key (source_referral_id) references public.referrals (id) on delete set null;

create index if not exists credits_source_referral_idx on public.credits (source_referral_id);
