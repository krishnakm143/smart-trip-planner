create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trip_id uuid not null references public.trips(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  amount integer not null check (amount >= 1 and amount <= 10000000),
  category text not null check (category in ('stay', 'food', 'transport', 'activities', 'shopping', 'other')),
  spent_on date not null,
  notes text not null default '' check (char_length(notes) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expenses_user_trip_spent_on_idx on public.expenses (user_id, trip_id, spent_on desc, created_at desc);
alter table public.expenses enable row level security;
grant select, insert, update, delete on public.expenses to authenticated;

drop policy if exists "Users can read their own expenses" on public.expenses;
create policy "Users can read their own expenses" on public.expenses for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users can create their own expenses" on public.expenses;
create policy "Users can create their own expenses" on public.expenses for insert to authenticated with check ((select auth.uid()) = user_id and exists (select 1 from public.trips where trips.id = trip_id and trips.user_id = (select auth.uid())));
drop policy if exists "Users can update their own expenses" on public.expenses;
create policy "Users can update their own expenses" on public.expenses for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users can delete their own expenses" on public.expenses;
create policy "Users can delete their own expenses" on public.expenses for delete to authenticated using ((select auth.uid()) = user_id);
