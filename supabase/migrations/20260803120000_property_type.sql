-- Add property type to properties.
--
-- Distinct from `accounts.account_type`, which describes who is paying (an
-- individual, a household, an HOA, a portfolio). This describes the building
-- itself, which is an operational fact a runner needs: a condo with a shared
-- bin corral, a vacation rental with guest turnover, and a second home that
-- sits empty for months all get serviced differently from a single-family
-- residence.
--
-- Additive and backward-compatible: existing rows keep NULL, and nothing reads
-- the column as required.

alter table public.properties
  add column property_type text
    check (property_type in (
      'single_family',
      'condo_townhome',
      'vacation_rental',
      'second_home',
      'hoa_community'
    ));
