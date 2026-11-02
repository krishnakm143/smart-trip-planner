-- Smart Trip Planner: managed identities plus user-owned saved trips.
-- This migration deliberately keeps the public catalogue and itinerary engine
-- on the existing Express/MongoDB service. Supabase owns authentication,
-- profiles and saved-trip data when AUTH_PROVIDER/TRIP_STORAGE are enabled.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Traveller' check (char_length(display_name) <= 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(
      coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1), 'Traveller'),
      60
    )
  );
  return new;
end;
$$;

-- This function is invoked only by the auth.users trigger; it is not a public
-- Data API endpoint despite using SECURITY DEFINER to insert the profile.
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- The project included an event-trigger helper before this migration. Event
-- triggers do not need REST/RPC execute privileges, so remove the accidental
-- public surface while preserving the trigger itself.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  destination jsonb not null,
  title text not null check (char_length(title) between 1 and 80),
  start_date timestamptz not null,
  end_date timestamptz not null check (end_date >= start_date),
  days integer not null check (days between 1 and 14),
  travelers integer not null check (travelers between 1 and 12),
  budget_tier text not null check (budget_tier in ('economy', 'standard', 'luxury')),
  interests jsonb not null default '[]'::jsonb,
  pace text not null default 'balanced' check (pace in ('relaxed', 'balanced', 'packed')),
  itinerary jsonb not null,
  budget jsonb not null,
  status text not null default 'planned' check (status in ('planned', 'completed', 'cancelled')),
  notes text not null default '' check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trips_user_created_at_idx on public.trips (user_id, created_at desc);

alter table public.trips enable row level security;

grant select, insert, update, delete on public.trips to authenticated;

drop policy if exists "Users can read their own trips" on public.trips;
create policy "Users can read their own trips"
  on public.trips for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own trips" on public.trips;
create policy "Users can create their own trips"
  on public.trips for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own trips" on public.trips;
create policy "Users can update their own trips"
  on public.trips for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own trips" on public.trips;
create policy "Users can delete their own trips"
  on public.trips for delete to authenticated
  using ((select auth.uid()) = user_id);
