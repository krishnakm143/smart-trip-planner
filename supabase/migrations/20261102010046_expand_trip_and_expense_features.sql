-- Smart Trip Planner: expanded trip and expense features.
-- Keep this migration id aligned with the connected Supabase project.
alter table public.trips
  add column if not exists origin text not null default '' check (char_length(origin) <= 80),
  add column if not exists trip_mode text not null default 'solo' check (trip_mode in ('solo', 'couple', 'family', 'friends', 'group')),
  add column if not exists members jsonb not null default '["Me"]'::jsonb,
  add column if not exists packing_list jsonb not null default '[]'::jsonb,
  add column if not exists reservations jsonb not null default '[]'::jsonb;

alter table public.expenses
  add column if not exists payment_method text not null default 'cash' check (payment_method in ('cash', 'card', 'upi', 'bank_transfer', 'other')),
  add column if not exists paid_by text not null default 'Me' check (char_length(paid_by) <= 60),
  add column if not exists split_type text not null default 'equal' check (split_type in ('equal', 'custom', 'none')),
  add column if not exists splits jsonb not null default '[]'::jsonb,
  add column if not exists currency text not null default 'INR' check (char_length(currency) <= 10),
  add column if not exists exchange_rate numeric not null default 1.0 check (exchange_rate > 0);
