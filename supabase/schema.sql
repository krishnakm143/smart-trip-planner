-- ==============================================================================
-- SMART TRIP PLANNER: COMPLETE SUPABASE PRODUCTION SCHEMA & SEED DATA
-- ==============================================================================
-- Run this entire script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query).
-- It establishes the complete database structure, security RLS policies,
-- auto-profile creation triggers, and destination catalog.

-- 1. PROFILES TABLE (Linked to auth.users)
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

-- 2. PROFILE CREATION TRIGGER
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
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. TRIPS TABLE
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  destination jsonb not null,
  title text not null check (char_length(title) between 1 and 80),
  origin text not null default '' check (char_length(origin) <= 80),
  trip_mode text not null default 'solo' check (trip_mode in ('solo', 'couple', 'family', 'friends', 'group')),
  members jsonb not null default '["Me"]'::jsonb,
  start_date timestamptz not null,
  end_date timestamptz not null check (end_date >= start_date),
  days integer not null check (days between 1 and 14),
  travelers integer not null check (travelers between 1 and 12),
  budget_tier text not null check (budget_tier in ('economy', 'standard', 'luxury')),
  interests jsonb not null default '[]'::jsonb,
  pace text not null default 'balanced' check (pace in ('relaxed', 'balanced', 'packed')),
  itinerary jsonb not null,
  budget jsonb not null,
  packing_list jsonb not null default '[]'::jsonb,
  reservations jsonb not null default '[]'::jsonb,
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

-- 4. EXPENSES TABLE
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trip_id uuid not null references public.trips(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  amount integer not null check (amount >= 1 and amount <= 10000000),
  category text not null check (category in ('stay', 'food', 'transport', 'activities', 'shopping', 'other')),
  spent_on date not null,
  payment_method text not null default 'cash' check (payment_method in ('cash', 'card', 'upi', 'bank_transfer', 'other')),
  paid_by text not null default 'Me' check (char_length(paid_by) <= 60),
  split_type text not null default 'equal' check (split_type in ('equal', 'custom', 'none')),
  splits jsonb not null default '[]'::jsonb,
  currency text not null default 'INR' check (char_length(currency) <= 10),
  exchange_rate numeric not null default 1.0 check (exchange_rate > 0),
  notes text not null default '' check (char_length(notes) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expenses_user_trip_spent_on_idx on public.expenses (user_id, trip_id, spent_on desc, created_at desc);
alter table public.expenses enable row level security;
grant select, insert, update, delete on public.expenses to authenticated;

drop policy if exists "Users can read their own expenses" on public.expenses;
create policy "Users can read their own expenses"
  on public.expenses for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own expenses" on public.expenses;
create policy "Users can create their own expenses"
  on public.expenses for insert to authenticated
  with check ((select auth.uid()) = user_id and exists (select 1 from public.trips where trips.id = trip_id and trips.user_id = (select auth.uid())));

drop policy if exists "Users can update their own expenses" on public.expenses;
create policy "Users can update their own expenses"
  on public.expenses for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own expenses" on public.expenses;
create policy "Users can delete their own expenses"
  on public.expenses for delete to authenticated
  using ((select auth.uid()) = user_id);

-- 5. DESTINATIONS & ACTIVITIES (Catalogue Tables)
create table if not exists public.destinations (
  id text primary key,
  slug text unique not null,
  name text not null,
  state text not null,
  category text not null,
  tagline text not null,
  description text not null,
  location jsonb not null,
  best_season text not null,
  ideal_days jsonb not null,
  daily_cost jsonb not null,
  rating numeric not null default 4.5,
  tags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.activities (
  id text primary key,
  destination_id text references public.destinations(id) on delete cascade,
  name text not null,
  type text not null,
  description text not null,
  location jsonb not null,
  duration_hours numeric not null default 1,
  entry_fee integer not null default 0,
  rating numeric not null default 4.5,
  best_time text not null default 'any',
  created_at timestamptz not null default now()
);

alter table public.destinations enable row level security;
alter table public.activities enable row level security;

grant select on public.destinations to anon, authenticated;
grant select on public.activities to anon, authenticated;

drop policy if exists "Allow public read on destinations" on public.destinations;
create policy "Allow public read on destinations" on public.destinations for select using (true);

drop policy if exists "Allow public read on activities" on public.activities;
create policy "Allow public read on activities" on public.activities for select using (true);

-- 6. SEED DESTINATIONS
insert into public.destinations (id, slug, name, state, category, tagline, description, location, best_season, ideal_days, daily_cost, rating, tags)
values ('4a44ab37e1dc8401395ad209', 'manali', 'Manali', 'Himachal Pradesh', 'hill-station', 'Snow peaks, cedar forests and the road to Rohtang', 'Manali sits at the head of the Kullu valley on the banks of the Beas, ringed by deodar forest and the Pir Panjal range. The old village, the wooden Hadimba temple and the hot springs at Vashisht are within walking distance, while Solang, the Atal Tunnel and Rohtang Pass make easy day trips for snow and adventure sports.', '{"lat":32.2432,"lng":77.1892}'::jsonb, 'March – June, October – February for snow', '{"min":3,"max":5}'::jsonb, '{"economy":{"stay":1200,"food":500,"transport":400},"standard":{"stay":3000,"food":900,"transport":900},"luxury":{"stay":8500,"food":2000,"transport":2200}}'::jsonb, 4.6, '["mountains","snow","himalaya","honeymoon","trekking","paragliding"]'::jsonb)
on conflict (id) do nothing;
insert into public.destinations (id, slug, name, state, category, tagline, description, location, best_season, ideal_days, daily_cost, rating, tags)
values ('5684b62ca471927ea8e5e9a6', 'goa', 'Goa', 'Goa', 'beach', 'Sun-soaked beaches, Portuguese quarters and seafood shacks', 'Goa pairs a hundred kilometres of Arabian Sea coastline with four and a half centuries of Portuguese heritage. The north is lively with beach shacks, markets and water sports; the south is quieter, with palm-lined coves such as Palolem. Inland lie the churches of Old Goa, spice plantations and the Dudhsagar falls.', '{"lat":15.4909,"lng":73.8278}'::jsonb, 'November – February', '{"min":3,"max":6}'::jsonb, '{"economy":{"stay":1500,"food":600,"transport":500},"standard":{"stay":4000,"food":1200,"transport":1000},"luxury":{"stay":12000,"food":2800,"transport":2500}}'::jsonb, 4.5, '["beach","nightlife","seafood","churches","water sports","friends"]'::jsonb)
on conflict (id) do nothing;
insert into public.destinations (id, slug, name, state, category, tagline, description, location, best_season, ideal_days, daily_cost, rating, tags)
values ('7a1577f80135bbf6862ba23e', 'jaipur', 'Jaipur', 'Rajasthan', 'heritage', 'The Pink City of hilltop forts, palaces and bazaars', 'Founded in 1727 as one of India’s first planned cities, Jaipur is the gateway to Rajasthan. Amber Fort and Nahargarh watch over a walled old town of pink facades, where the City Palace, Hawa Mahal and the Jantar Mantar observatory stand a few minutes apart. The bazaars are known for gemstones, block prints and blue pottery.', '{"lat":26.9124,"lng":75.7873}'::jsonb, 'October – March', '{"min":2,"max":4}'::jsonb, '{"economy":{"stay":1000,"food":450,"transport":350},"standard":{"stay":3000,"food":900,"transport":800},"luxury":{"stay":10000,"food":2200,"transport":2000}}'::jsonb, 4.5, '["forts","palaces","rajasthan","golden triangle","shopping","history"]'::jsonb)
on conflict (id) do nothing;
insert into public.destinations (id, slug, name, state, category, tagline, description, location, best_season, ideal_days, daily_cost, rating, tags)
values ('dacd6f63a70e4e690edf2251', 'udaipur', 'Udaipur', 'Rajasthan', 'heritage', 'Lake palaces and sunsets over the Aravallis', 'Udaipur, the former capital of Mewar, is built around a chain of man-made lakes in the Aravalli hills. The City Palace rises straight from the edge of Lake Pichola, facing the island Lake Palace, and the old town around Jagdish Temple is a maze of havelis, rooftop cafes and miniature-painting studios.', '{"lat":24.5854,"lng":73.7125}'::jsonb, 'September – March', '{"min":2,"max":4}'::jsonb, '{"economy":{"stay":1200,"food":450,"transport":350},"standard":{"stay":3500,"food":1000,"transport":800},"luxury":{"stay":14000,"food":2500,"transport":2200}}'::jsonb, 4.6, '["lakes","palaces","rajasthan","romantic","mewar","history"]'::jsonb)
on conflict (id) do nothing;
insert into public.destinations (id, slug, name, state, category, tagline, description, location, best_season, ideal_days, daily_cost, rating, tags)
values ('5cb39ed67f28bec86e1cf980', 'munnar', 'Munnar', 'Kerala', 'hill-station', 'Rolling tea estates in the misty Western Ghats', 'Munnar lies at about 1,600 metres in the Western Ghats, where three mountain streams meet among some of the highest tea estates in the world. Eravikulam National Park shelters the endangered Nilgiri tahr below Anamudi, South India’s highest peak, and the roads to Top Station and Kolukkumalai give wide views over the plantations.', '{"lat":10.0889,"lng":77.0595}'::jsonb, 'September – March', '{"min":2,"max":4}'::jsonb, '{"economy":{"stay":1200,"food":400,"transport":500},"standard":{"stay":3200,"food":800,"transport":1000},"luxury":{"stay":9000,"food":1800,"transport":2200}}'::jsonb, 4.5, '["tea gardens","kerala","western ghats","honeymoon","wildlife","mist"]'::jsonb)
on conflict (id) do nothing;
insert into public.destinations (id, slug, name, state, category, tagline, description, location, best_season, ideal_days, daily_cost, rating, tags)
values ('a1060a3b7bf215e90d1d0aa1', 'alleppey', 'Alleppey', 'Kerala', 'nature', 'Houseboats drifting through Kerala’s backwaters', 'Alleppey (Alappuzha) is the hub of the Kerala backwaters, a network of canals, lagoons and paddy fields lying below sea level in Kuttanad. Converted rice barges cruise from Punnamada Lake past villages, toddy shops and duck farms, while the town itself has a long beach, an old sea pier and a coir-trading past.', '{"lat":9.4981,"lng":76.3388}'::jsonb, 'October – February', '{"min":2,"max":3}'::jsonb, '{"economy":{"stay":1300,"food":450,"transport":400},"standard":{"stay":3500,"food":900,"transport":800},"luxury":{"stay":11000,"food":2000,"transport":2000}}'::jsonb, 4.4, '["backwaters","houseboat","kerala","kuttanad","relaxing","beach"]'::jsonb)
on conflict (id) do nothing;
insert into public.destinations (id, slug, name, state, category, tagline, description, location, best_season, ideal_days, daily_cost, rating, tags)
values ('5b3b7d1f94a1c981662ecf49', 'rishikesh', 'Rishikesh', 'Uttarakhand', 'adventure', 'White-water rafting and evening aarti on the Ganga', 'Rishikesh is where the Ganga leaves the Himalayan foothills, and it is known equally for ashrams and for adventure. Mornings are for rafting the rapids below Shivpuri or bungee jumping at Mohan Chatti; evenings are for the Ganga aarti at Triveni Ghat and Parmarth Niketan. The town is vegetarian and alcohol-free.', '{"lat":30.0869,"lng":78.2676}'::jsonb, 'September – November, February – May', '{"min":2,"max":4}'::jsonb, '{"economy":{"stay":800,"food":400,"transport":300},"standard":{"stay":2500,"food":800,"transport":700},"luxury":{"stay":9000,"food":1800,"transport":1800}}'::jsonb, 4.5, '["rafting","yoga","ganga","bungee","ashram","camping"]'::jsonb)
on conflict (id) do nothing;
insert into public.destinations (id, slug, name, state, category, tagline, description, location, best_season, ideal_days, daily_cost, rating, tags)
values ('ec8aacf2d867515857867e00', 'varanasi', 'Varanasi', 'Uttar Pradesh', 'spiritual', 'Ghats, temple bells and dawn on the Ganga', 'Varanasi, also called Kashi or Banaras, is one of the oldest continuously inhabited cities in the world and the holiest in Hinduism. More than eighty ghats line the western bank of the Ganga, best seen by boat at sunrise and during the evening aarti at Dashashwamedh. Sarnath, where the Buddha gave his first sermon, is a short drive away.', '{"lat":25.3176,"lng":82.9739}'::jsonb, 'October – March', '{"min":2,"max":3}'::jsonb, '{"economy":{"stay":900,"food":350,"transport":300},"standard":{"stay":2800,"food":750,"transport":650},"luxury":{"stay":9500,"food":1800,"transport":1700}}'::jsonb, 4.5, '["ghats","kashi","banaras","ganga aarti","temples","street food"]'::jsonb)
on conflict (id) do nothing;
insert into public.destinations (id, slug, name, state, category, tagline, description, location, best_season, ideal_days, daily_cost, rating, tags)
values ('b81314865858cca4f39421ec', 'darjeeling', 'Darjeeling', 'West Bengal', 'hill-station', 'Toy train, tea gardens and Kanchenjunga at sunrise', 'Darjeeling spreads along a ridge at 2,000 metres facing Kanchenjunga, the third-highest mountain in the world. The UNESCO-listed Darjeeling Himalayan Railway still runs steam joy rides to Ghum, the surrounding slopes produce the tea that carries the town’s name, and the sunrise from Tiger Hill is the classic early-morning outing.', '{"lat":27.041,"lng":88.2663}'::jsonb, 'March – May, October – December', '{"min":2,"max":4}'::jsonb, '{"economy":{"stay":1200,"food":450,"transport":450},"standard":{"stay":3000,"food":850,"transport":900},"luxury":{"stay":9000,"food":1900,"transport":2200}}'::jsonb, 4.4, '["tea","toy train","kanchenjunga","himalaya","monasteries","sunrise"]'::jsonb)
on conflict (id) do nothing;
insert into public.destinations (id, slug, name, state, category, tagline, description, location, best_season, ideal_days, daily_cost, rating, tags)
values ('f4b3860d5fb44fa3f8b28e1b', 'jaisalmer', 'Jaisalmer', 'Rajasthan', 'desert', 'A golden sandstone fort rising out of the Thar', 'Jaisalmer grew rich on the camel-caravan trade, and its merchants left behind a living fort and havelis carved from honey-coloured sandstone. Around a quarter of the old town still lives inside the fort walls. West of the city the Thar desert begins, with camel safaris and overnight camps on the dunes at Sam.', '{"lat":26.9157,"lng":70.9083}'::jsonb, 'November – February', '{"min":2,"max":3}'::jsonb, '{"economy":{"stay":1000,"food":450,"transport":450},"standard":{"stay":3000,"food":900,"transport":1000},"luxury":{"stay":12000,"food":2200,"transport":2500}}'::jsonb, 4.4, '["thar desert","camel safari","fort","rajasthan","dunes","havelis"]'::jsonb)
on conflict (id) do nothing;
insert into public.destinations (id, slug, name, state, category, tagline, description, location, best_season, ideal_days, daily_cost, rating, tags)
values ('c029d5c60201a18065ed9b98', 'kutch', 'Kutch', 'Gujarat', 'desert', 'The white salt desert and the craft villages of Gujarat', 'Kutch is India’s largest district, stretching from the old walled town of Bhuj to the Great Rann, a seasonal salt marsh that dries into a white desert each winter. The villages around Bhuj are known for embroidery, weaving and Rogan painting, the coast at Mandvi has a shipbuilding yard and a palace, and the Harappan city of Dholavira is a UNESCO World Heritage Site.', '{"lat":23.242,"lng":69.6669}'::jsonb, 'November – February (Rann Utsav)', '{"min":3,"max":5}'::jsonb, '{"economy":{"stay":1100,"food":400,"transport":600},"standard":{"stay":3000,"food":800,"transport":1300},"luxury":{"stay":9500,"food":1700,"transport":2800}}'::jsonb, 4.4, '["white rann","rann utsav","bhuj","gujarat","handicrafts","dholavira"]'::jsonb)
on conflict (id) do nothing;
insert into public.destinations (id, slug, name, state, category, tagline, description, location, best_season, ideal_days, daily_cost, rating, tags)
values ('6988e0e8dd77fe5a45ef6fa2', 'leh-ladakh', 'Leh-Ladakh', 'Ladakh', 'adventure', 'High passes, blue lakes and cliff-top monasteries', 'Leh, at 3,500 metres in the upper Indus valley, is the base for exploring Ladakh. Whitewashed monasteries such as Thiksey and Hemis sit on crags above the river, the road north climbs over Khardung La, and Pangong Tso lies a long day’s drive to the east. Keep the first day free to acclimatise to the altitude.', '{"lat":34.1526,"lng":77.5771}'::jsonb, 'May – September', '{"min":5,"max":8}'::jsonb, '{"economy":{"stay":1400,"food":550,"transport":900},"standard":{"stay":3500,"food":1000,"transport":1800},"luxury":{"stay":11000,"food":2200,"transport":3500}}'::jsonb, 4.7, '["ladakh","pangong","road trip","monasteries","himalaya","bike trip"]'::jsonb)
on conflict (id) do nothing;

-- 7. SEED ACTIVITIES
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('edabf2c5e4a63967dcc08baf', '4a44ab37e1dc8401395ad209', 'Hadimba Devi Temple', 'spiritual', 'A four-tiered wooden pagoda temple from 1553, set in a grove of tall deodar trees in Dhungri.', '{"lat":32.2483,"lng":77.1806}'::jsonb, 1, 0, 4.6, 'morning')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('e7d05929d73922ff6fc21a07', '4a44ab37e1dc8401395ad209', 'Solang Valley', 'adventure', 'Open meadow below the glaciers with a ropeway, paragliding and zorbing in summer and skiing in winter. The fee covers the ropeway ticket.', '{"lat":32.3166,"lng":77.157}'::jsonb, 4, 700, 4.5, 'morning')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('bb2ff9da10d54468765ebe70', '4a44ab37e1dc8401395ad209', 'Rohtang Pass', 'adventure', 'The 3,978 m pass on the Pir Panjal range with snow for most of the season. Vehicles need a permit, shared here per person.', '{"lat":32.3716,"lng":77.2466}'::jsonb, 5, 550, 4.7, 'morning')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('41ff86ce4bda0c449c93038c', '4a44ab37e1dc8401395ad209', 'Jogini Waterfall Trek', 'nature', 'An easy trail from Vashisht through apple orchards and pine forest to a 45 m waterfall.', '{"lat":32.2752,"lng":77.188}'::jsonb, 3, 0, 4.6, 'morning')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('89da807ffd5e8589bb21b0d1', '4a44ab37e1dc8401395ad209', 'Sissu via Atal Tunnel', 'nature', 'Drive through the 9 km Atal Tunnel into Lahaul for the Sissu waterfall, the lake and wide Chandra valley views.', '{"lat":32.4689,"lng":77.1323}'::jsonb, 4, 0, 4.6, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('3459ff0fdc590e6986d3edb1', '4a44ab37e1dc8401395ad209', 'Vashisht Hot Springs', 'spiritual', 'Natural sulphur springs with public baths beside the old stone Vashisht and Rama temples.', '{"lat":32.2639,"lng":77.1886}'::jsonb, 1.5, 0, 4.3, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('f99ecedb42bf1e49bf07cf21', '4a44ab37e1dc8401395ad209', 'Van Vihar National Park', 'nature', 'A quiet deodar park beside the Beas in the middle of town, with walking paths and a small boating pond.', '{"lat":32.2394,"lng":77.1892}'::jsonb, 1, 20, 4, 'afternoon')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('f0ddc810c22481824f24178a', '4a44ab37e1dc8401395ad209', 'Naggar Castle', 'culture', 'A 15th-century stone-and-timber castle of the Kullu rajas, now a heritage hotel with a small museum and valley views.', '{"lat":32.1118,"lng":77.1646}'::jsonb, 2, 30, 4.3, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('122600ad9c31607f5ba67217', '4a44ab37e1dc8401395ad209', 'Old Manali Cafes', 'food', 'The lane above the Manalsu stream is lined with cafes serving wood-fired trout, Israeli plates and Himachali siddu.', '{"lat":32.2548,"lng":77.176}'::jsonb, 2, 0, 4.4, 'evening')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('006a67109ec75ffaaee5aa72', '4a44ab37e1dc8401395ad209', 'Mall Road Manali', 'shopping', 'The pedestrian main street for Kullu shawls, woollens and local fruit wines, busiest after sunset.', '{"lat":32.2433,"lng":77.189}'::jsonb, 1.5, 0, 4.2, 'evening')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('303ebcdb0171340567e7837d', '5684b62ca471927ea8e5e9a6', 'Fort Aguada', 'culture', 'A 1612 Portuguese fort and lighthouse on the headland above Sinquerim, guarding the mouth of the Mandovi.', '{"lat":15.492,"lng":73.7737}'::jsonb, 1.5, 0, 4.4, 'morning')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('6035312a954a993ceab59a14', '5684b62ca471927ea8e5e9a6', 'Basilica of Bom Jesus', 'spiritual', 'The baroque basilica in Old Goa that holds the relics of St Francis Xavier, part of a UNESCO World Heritage Site.', '{"lat":15.5009,"lng":73.9116}'::jsonb, 1, 0, 4.6, 'morning')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('248bad2ff19c4931759fe369', '5684b62ca471927ea8e5e9a6', 'Se Cathedral', 'culture', 'One of the largest churches in Asia, completed in 1619, known for its Golden Bell and Tuscan facade.', '{"lat":15.5039,"lng":73.9121}'::jsonb, 1, 0, 4.5, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('62faf78c78c8686a7005c182', '5684b62ca471927ea8e5e9a6', 'Fontainhas Latin Quarter', 'culture', 'Panaji’s old Portuguese neighbourhood of narrow lanes, tiled-roof houses painted ochre and blue, bakeries and galleries.', '{"lat":15.4968,"lng":73.8313}'::jsonb, 2, 0, 4.4, 'afternoon')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('55874c412bb982d37ea3099b', '5684b62ca471927ea8e5e9a6', 'Baga Beach Water Sports', 'adventure', 'Parasailing, jet-ski and banana-boat rides off the busiest beach in North Goa. The fee is a typical combo package.', '{"lat":15.5553,"lng":73.7517}'::jsonb, 2, 1500, 4.2, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('1609a39034534c466b9f0dbe', '5684b62ca471927ea8e5e9a6', 'Anjuna Flea Market', 'shopping', 'A beachside market that began in the hippie era, selling clothes, jewellery, spices and handicrafts.', '{"lat":15.5736,"lng":73.74}'::jsonb, 2, 0, 4.1, 'afternoon')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('653f281884f6b7f68ab15abe', '5684b62ca471927ea8e5e9a6', 'Chapora Fort', 'sightseeing', 'Laterite ramparts on a hill above Vagator with a sweeping sunset view of the coast and the Chapora river.', '{"lat":15.606,"lng":73.7366}'::jsonb, 1.5, 0, 4.3, 'evening')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('8a077dccccdd576ae80fc422', '5684b62ca471927ea8e5e9a6', 'Dudhsagar Falls', 'nature', 'A 310 m four-tiered waterfall on the Mandovi inside Bhagwan Mahavir sanctuary, reached by forest jeep from Kulem.', '{"lat":15.3144,"lng":74.3143}'::jsonb, 5, 500, 4.5, 'morning')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('09a28822284373c87c3497c0', '5684b62ca471927ea8e5e9a6', 'Palolem Beach', 'nature', 'A calm crescent bay in South Goa fringed with coconut palms, good for swimming, kayaking and dolphin boats.', '{"lat":15.01,"lng":74.0232}'::jsonb, 3, 0, 4.6, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('dec384bd6597f7cbf12fe403', '5684b62ca471927ea8e5e9a6', 'Sahakari Spice Farm', 'food', 'A guided walk through a working spice plantation near Ponda followed by a Goan buffet lunch served on banana leaves.', '{"lat":15.4082,"lng":74.0238}'::jsonb, 2.5, 500, 4.3, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('d65709f9e2887b7f8206c677', '7a1577f80135bbf6862ba23e', 'Amber Fort', 'culture', 'The hilltop palace-fort of the Kachhwaha rulers, with the mirrored Sheesh Mahal and courtyards above Maota Lake.', '{"lat":26.9855,"lng":75.8513}'::jsonb, 3, 100, 4.7, 'morning')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('203a61f559176753c5cabcab', '7a1577f80135bbf6862ba23e', 'Hawa Mahal', 'sightseeing', 'The five-storey "Palace of Winds" with 953 latticed windows, built so royal women could watch the street unseen.', '{"lat":26.9239,"lng":75.8267}'::jsonb, 1, 50, 4.5, 'morning')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('31a945514afa2103184dfdcb', '7a1577f80135bbf6862ba23e', 'City Palace Jaipur', 'culture', 'The royal residence at the heart of the old city, with museums of textiles and arms and the painted Pritam Niwas Chowk.', '{"lat":26.9258,"lng":75.8237}'::jsonb, 2, 200, 4.5, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('229f1278edbac31a397725e2', '7a1577f80135bbf6862ba23e', 'Jantar Mantar', 'culture', 'An 18th-century observatory of giant masonry instruments, including the world’s largest stone sundial. UNESCO listed.', '{"lat":26.9248,"lng":75.8246}'::jsonb, 1, 50, 4.5, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('0f3005c38568446599f65c1d', '7a1577f80135bbf6862ba23e', 'Jal Mahal', 'sightseeing', 'A palace that appears to float in Man Sagar Lake, viewed from the promenade on the Amber road.', '{"lat":26.9535,"lng":75.8462}'::jsonb, 0.5, 0, 4.2, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('7063e20a680cb2b85d237130', '7a1577f80135bbf6862ba23e', 'Nahargarh Fort', 'sightseeing', 'A ridge-top fort on the Aravallis with the best sunset view over the whole of Jaipur.', '{"lat":26.9373,"lng":75.8155}'::jsonb, 2, 50, 4.5, 'evening')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('a66945623dfca068273eae20', '7a1577f80135bbf6862ba23e', 'Galta Ji Temple', 'spiritual', 'A pilgrimage site of temples and natural spring-fed tanks built into a narrow gorge east of the city.', '{"lat":26.9165,"lng":75.8573}'::jsonb, 1.5, 0, 4.3, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('46dbf56755ddeb15b640439d', '7a1577f80135bbf6862ba23e', 'Jhalana Leopard Safari', 'nature', 'A jeep safari through a dry deciduous forest reserve inside the city limits with frequent leopard sightings.', '{"lat":26.8551,"lng":75.8334}'::jsonb, 3, 1200, 4.5, 'morning')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('3c0e2004d65db3662370195e', '7a1577f80135bbf6862ba23e', 'Johari and Bapu Bazaar', 'shopping', 'Old-city markets for gemstones, silver jewellery, block-printed textiles, mojari shoes and lac bangles.', '{"lat":26.9196,"lng":75.8246}'::jsonb, 2, 0, 4.3, 'afternoon')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('6fd928f5746d98e7c5ea8c9f', '7a1577f80135bbf6862ba23e', 'Chokhi Dhani', 'food', 'A recreated Rajasthani village with folk dance, puppet shows and a traditional thali dinner. The fee includes the meal.', '{"lat":26.7665,"lng":75.8363}'::jsonb, 3, 900, 4.3, 'evening')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('bb609089495555135b571ebb', 'dacd6f63a70e4e690edf2251', 'City Palace Udaipur', 'culture', 'A complex of eleven palaces built over 400 years on the bank of Lake Pichola, with mirror-work halls and peacock mosaics.', '{"lat":24.5764,"lng":73.6835}'::jsonb, 2.5, 300, 4.6, 'morning')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('b939caefc03b2639cbdb44f1', 'dacd6f63a70e4e690edf2251', 'Lake Pichola Boat Ride', 'sightseeing', 'A boat trip from Rameshwar Ghat past the Lake Palace to Jag Mandir island, best in the golden hour before sunset.', '{"lat":24.572,"lng":73.679}'::jsonb, 1, 500, 4.6, 'evening')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('c0f08171a0d72f17fc51c23f', 'dacd6f63a70e4e690edf2251', 'Jagdish Temple', 'spiritual', 'A 1651 Indo-Aryan temple to Vishnu reached by a steep flight of steps, covered in carved dancers and elephants.', '{"lat":24.5797,"lng":73.6838}'::jsonb, 0.5, 0, 4.5, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('b9c189213e21fac3d6a2347b', 'dacd6f63a70e4e690edf2251', 'Bagore Ki Haveli', 'culture', 'An 18th-century haveli museum at Gangaur Ghat that hosts the Dharohar folk dance and puppet show every evening.', '{"lat":24.5799,"lng":73.6822}'::jsonb, 1.5, 150, 4.5, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('9ac532fc1918a0b27c89f3ea', 'dacd6f63a70e4e690edf2251', 'Saheliyon Ki Bari', 'nature', 'The "Garden of the Maidens", laid out for the royal ladies with lotus pools, marble elephants and rain fountains.', '{"lat":24.603,"lng":73.6862}'::jsonb, 1, 20, 4.3, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('9567695995a9e0af38c44777', 'dacd6f63a70e4e690edf2251', 'Fateh Sagar Lake', 'nature', 'A hill-ringed lake north of the old city with a lakeside drive, boat rides to Nehru Park and street-food stalls.', '{"lat":24.6014,"lng":73.6742}'::jsonb, 1.5, 0, 4.5, 'afternoon')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('ca4f157e2092a7385afa5850', 'dacd6f63a70e4e690edf2251', 'Sajjangarh Monsoon Palace', 'sightseeing', 'A hilltop palace inside a wildlife sanctuary, built to watch the monsoon clouds, with wide sunset views of the lakes.', '{"lat":24.5937,"lng":73.6397}'::jsonb, 2, 150, 4.4, 'evening')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('70618f0d50d8004fb493ba47', 'dacd6f63a70e4e690edf2251', 'Karni Mata Ropeway', 'adventure', 'A cable car from Deen Dayal Park up Machla Magra hill to the Karni Mata temple, with a bird’s-eye view of Pichola.', '{"lat":24.5694,"lng":73.6858}'::jsonb, 1, 130, 4.3, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('f746f9c7c00b78795b3d9ec1', 'dacd6f63a70e4e690edf2251', 'Shilpgram', 'culture', 'A rural arts and crafts village with traditional huts from western Indian states, working artisans and folk performers.', '{"lat":24.6131,"lng":73.6634}'::jsonb, 2, 50, 4.2, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('2492139291f7568c4a66b064', 'dacd6f63a70e4e690edf2251', 'Hathi Pol Bazaar', 'shopping', 'The old-city market for miniature paintings, pichwai art, leather journals and tie-dye textiles.', '{"lat":24.5868,"lng":73.6869}'::jsonb, 1.5, 0, 4.1, 'afternoon')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('412bb2c28c123868b1b357f0', '5cb39ed67f28bec86e1cf980', 'Eravikulam National Park', 'nature', 'Rolling shola grassland at Rajamalai, home to the endangered Nilgiri tahr. Park buses run from the entrance to the trail.', '{"lat":10.1553,"lng":77.0617}'::jsonb, 3, 200, 4.5, 'morning')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('b9492961e8775f9791c4b87f', '5cb39ed67f28bec86e1cf980', 'Kolukkumalai Jeep Safari', 'adventure', 'A rough jeep track from Suryanelli up to the world’s highest tea estate at 2,100 m, with views above the clouds at sunrise.', '{"lat":10.0827,"lng":77.2218}'::jsonb, 5, 800, 4.7, 'morning')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('4706665ebbb48f50e72604d8', '5cb39ed67f28bec86e1cf980', 'Tea Museum Munnar', 'culture', 'The KDHP museum at Nullatanni estate traces the history of tea in the High Range, with a working mini factory and tasting.', '{"lat":10.0935,"lng":77.0509}'::jsonb, 1.5, 125, 4.2, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('468f719084db207eb9716656', '5cb39ed67f28bec86e1cf980', 'Mattupetty Dam', 'sightseeing', 'A reservoir among tea slopes and an Indo-Swiss dairy farm, with speed boats and the chance of wild elephants on the banks.', '{"lat":10.1063,"lng":77.1237}'::jsonb, 1.5, 0, 4.2, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('56d71caccc02223a952b8c72', '5cb39ed67f28bec86e1cf980', 'Echo Point', 'sightseeing', 'A lakeside bend on the Top Station road where the hills throw your voice back across the water.', '{"lat":10.1208,"lng":77.1517}'::jsonb, 0.5, 0, 4, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('5cf3014e83fd65c026f98178', '5cb39ed67f28bec86e1cf980', 'Kundala Lake', 'nature', 'A high-altitude arch-dam lake with pedal boats and shikaras, surrounded by cherry blossom in season.', '{"lat":10.1436,"lng":77.1987}'::jsonb, 1.5, 0, 4.2, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('20a5811eaec3a330f57a2668', '5cb39ed67f28bec86e1cf980', 'Top Station', 'nature', 'The highest point on the Munnar–Kodaikanal road at 1,700 m, looking down on the Tamil Nadu plains and the Theni valley.', '{"lat":10.1236,"lng":77.2458}'::jsonb, 1.5, 25, 4.4, 'morning')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('54d7fd66bf246a387d0a2890', '5cb39ed67f28bec86e1cf980', 'Attukad Waterfalls', 'nature', 'A waterfall in a narrow forested valley off the Pallivasal road, reached by a short walk through plantations.', '{"lat":10.0535,"lng":77.0586}'::jsonb, 1.5, 0, 4.2, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('c6e8510327a33e7d6d6001b5', '5cb39ed67f28bec86e1cf980', 'Pothamedu View Point', 'nature', 'A ridge a few kilometres from town with an open view over tea, coffee and cardamom estates, best near sunset.', '{"lat":10.0615,"lng":77.0648}'::jsonb, 1, 0, 4.3, 'evening')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('93b528e68e94dc64c9bc639c', '5cb39ed67f28bec86e1cf980', 'Munnar Town Market', 'shopping', 'Shops around the main bazaar selling estate-fresh tea, cardamom, pepper and homemade chocolate.', '{"lat":10.0892,"lng":77.0597}'::jsonb, 1, 0, 4, 'evening')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('a71ef503b39d3c1d158de8b5', 'a1060a3b7bf215e90d1d0aa1', 'Backwater Houseboat Cruise', 'sightseeing', 'A day cruise on a converted rice barge from Punnamada jetty through the canals of Kuttanad, with a Kerala lunch on board.', '{"lat":9.5087,"lng":76.354}'::jsonb, 5, 1500, 4.7, 'morning')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('84d8fa7326db2ad5469d835d', 'a1060a3b7bf215e90d1d0aa1', 'Backwater Kayaking at Kainakary', 'adventure', 'A guided paddle through narrow village canals that houseboats cannot enter, starting soon after sunrise.', '{"lat":9.479,"lng":76.387}'::jsonb, 3, 1000, 4.6, 'morning')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('85d28aafa6739951e1584349', 'a1060a3b7bf215e90d1d0aa1', 'Alappuzha Beach', 'nature', 'A long sandy beach with the remains of a 150-year-old sea pier, popular with locals at sunset.', '{"lat":9.493,"lng":76.3176}'::jsonb, 1.5, 0, 4.3, 'evening')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('ad70fb4c1cfe9dce808e1a96', 'a1060a3b7bf215e90d1d0aa1', 'Alappuzha Lighthouse', 'sightseeing', 'A red-and-white 1862 lighthouse near the beach; climb the spiral stairs for a view over the town and coast.', '{"lat":9.4941,"lng":76.3204}'::jsonb, 0.5, 20, 4.2, 'afternoon')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('fc2a81ed29d97e07e586769f', 'a1060a3b7bf215e90d1d0aa1', 'Marari Beach', 'nature', 'A quiet fishing-village beach at Mararikulam, north of town, with clean sand and hammocks under the palms.', '{"lat":9.601,"lng":76.2985}'::jsonb, 3, 0, 4.5, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('9b0aaea98436f1ff6a5a55f7', 'a1060a3b7bf215e90d1d0aa1', 'Pathiramanal Island', 'nature', 'A small uninhabited island in Vembanad Lake reached by boat, known for migratory birds. The fee is a shared boat fare.', '{"lat":9.6188,"lng":76.3847}'::jsonb, 2.5, 300, 4.2, 'morning')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('b10baac2aa854574a5d3d17c', 'a1060a3b7bf215e90d1d0aa1', 'Ambalappuzha Sree Krishna Temple', 'spiritual', 'A Kerala-style temple famous for its sweet milk payasam, offered daily for centuries.', '{"lat":9.3836,"lng":76.3697}'::jsonb, 1, 0, 4.6, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('faa3f883805d3a5d76d44305', 'a1060a3b7bf215e90d1d0aa1', 'Revi Karunakaran Museum', 'culture', 'A private collection of Swarovski crystal, ivory, porcelain and Tanjore paintings gathered by a coir-exporting family.', '{"lat":9.4992,"lng":76.3288}'::jsonb, 1, 150, 4.4, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('a3a65fedf20ee44364a18f1b', 'a1060a3b7bf215e90d1d0aa1', 'Krishnapuram Palace', 'culture', 'An 18th-century Travancore palace near Kayamkulam housing Gajendra Moksham, one of the largest murals in Kerala.', '{"lat":9.1497,"lng":76.5086}'::jsonb, 1.5, 35, 4.2, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('bfc07d931a238b097ea20001', 'a1060a3b7bf215e90d1d0aa1', 'Mullakkal Street Market', 'shopping', 'The town’s main bazaar around the Mullakkal Rajarajeswari temple, for coir products, banana chips and spices.', '{"lat":9.4975,"lng":76.342}'::jsonb, 1, 0, 4, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('144c53d31b9a654199aabe89', '5b3b7d1f94a1c981662ecf49', 'Ganga Rafting from Shivpuri', 'adventure', 'A 16 km white-water run from Shivpuri to Rishikesh through grade III rapids such as Roller Coaster and Golf Course.', '{"lat":30.1383,"lng":78.389}'::jsonb, 3.5, 1000, 4.7, 'morning')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('9ca37ee58b6f92bf630f8b07', '5b3b7d1f94a1c981662ecf49', 'Bungee Jumping at Mohan Chatti', 'adventure', 'India’s highest fixed-platform bungee at 83 m, over a rocky tributary valley of the Ganga.', '{"lat":30.0641,"lng":78.402}'::jsonb, 3, 4000, 4.6, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('c9d5d87a9905af50689d3308', '5b3b7d1f94a1c981662ecf49', 'Triveni Ghat Ganga Aarti', 'spiritual', 'The main bathing ghat of the town, where priests perform the Maha Aarti with tiered lamps at dusk.', '{"lat":30.1036,"lng":78.3049}'::jsonb, 1.5, 0, 4.7, 'evening')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('5365f71d745dd11b70e55263', '5b3b7d1f94a1c981662ecf49', 'Parmarth Niketan Ashram', 'spiritual', 'The largest ashram in Rishikesh, on the east bank near Ram Jhula, with riverside gardens and daily yoga and satsang.', '{"lat":30.1192,"lng":78.3122}'::jsonb, 1.5, 0, 4.7, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('a804e2c44fb1e16e0da98076', '5b3b7d1f94a1c981662ecf49', 'Ram Jhula', 'sightseeing', 'A 230 m iron suspension footbridge across the Ganga linking Sivananda Ashram with the Swarg Ashram side.', '{"lat":30.1236,"lng":78.3145}'::jsonb, 1, 0, 4.5, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('81825e0741443c85e8d24ead', '5b3b7d1f94a1c981662ecf49', 'Laxman Jhula', 'sightseeing', 'The landmark 1929 suspension bridge at Tapovan, beside the thirteen-storey Trayambakeshwar temple.', '{"lat":30.1263,"lng":78.3296}'::jsonb, 1, 0, 4.4, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('b7b94d5e8e9b48e41afce5cc', '5b3b7d1f94a1c981662ecf49', 'Beatles Ashram', 'culture', 'The abandoned ashram of Maharishi Mahesh Yogi where the Beatles stayed in 1968, now covered in murals inside Rajaji reserve.', '{"lat":30.1136,"lng":78.3118}'::jsonb, 1.5, 150, 4.4, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('796fe9d0868ad7debc28a606', '5b3b7d1f94a1c981662ecf49', 'Neer Garh Waterfall', 'nature', 'A short forest hike off the Badrinath road to a series of clear pools and cascades.', '{"lat":30.1442,"lng":78.3373}'::jsonb, 2, 30, 4.3, 'morning')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('c6a660fd85c0bdd3361bad2b', '5b3b7d1f94a1c981662ecf49', 'Kunjapuri Temple Viewpoint', 'nature', 'A hilltop Shakti Peeth at 1,650 m with a panorama of the Swargarohini, Gangotri and Chaukhamba peaks, popular at sunrise.', '{"lat":30.1836,"lng":78.3072}'::jsonb, 3, 0, 4.5, 'morning')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('35b4b2271bce0bc1254f35a9', '5b3b7d1f94a1c981662ecf49', 'Tapovan Cafes', 'food', 'Riverside cafes above Laxman Jhula serving vegetarian world food, wood-fired pizza and ginger-lemon-honey tea.', '{"lat":30.13,"lng":78.325}'::jsonb, 1.5, 0, 4.4, 'afternoon')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('bc8bdfcbe45bee0d6cb2bf55', 'ec8aacf2d867515857867e00', 'Ganga Boat Ride from Assi Ghat', 'sightseeing', 'A rowing-boat trip downstream past the ghats, at its best at dawn after the Subah-e-Banaras morning aarti.', '{"lat":25.2888,"lng":83.0062}'::jsonb, 1.5, 300, 4.7, 'morning')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('47eececfd43403c5305dca1d', 'ec8aacf2d867515857867e00', 'Kashi Vishwanath Temple', 'spiritual', 'The gold-spired temple of Shiva as Lord of the Universe, one of the twelve jyotirlingas, now reached by a wide corridor from the river.', '{"lat":25.3109,"lng":83.0107}'::jsonb, 2, 0, 4.7, 'morning')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('41a99662edf4f63c903d1844', 'ec8aacf2d867515857867e00', 'Dashashwamedh Ghat Ganga Aarti', 'spiritual', 'The nightly ceremony of fire, incense and conch shells performed by seven priests on the main ghat.', '{"lat":25.3069,"lng":83.0104}'::jsonb, 1.5, 0, 4.8, 'evening')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('22e56452e30c8afca5ab65a4', 'ec8aacf2d867515857867e00', 'Sarnath', 'culture', 'The deer park where the Buddha gave his first sermon, with the Dhamek Stupa, monastery ruins and the Ashokan lion capital in the museum.', '{"lat":25.3811,"lng":83.0245}'::jsonb, 3, 25, 4.6, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('96ec627d4f12566fa138eec7', 'ec8aacf2d867515857867e00', 'Manikarnika Ghat Heritage Walk', 'culture', 'A guided walk through the old-city lanes to the principal cremation ghat, explaining the rituals of Kashi.', '{"lat":25.3108,"lng":83.0141}'::jsonb, 1.5, 0, 4.4, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('fb7bddb141aea423e5abf8bb', 'ec8aacf2d867515857867e00', 'Bharat Kala Bhavan, BHU', 'culture', 'The university museum on the leafy BHU campus with miniature paintings, sculpture and Banarasi textiles.', '{"lat":25.2714,"lng":82.9958}'::jsonb, 2, 20, 4.4, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('ecd6ebab54daf2fde55ec375', 'ec8aacf2d867515857867e00', 'Ramnagar Fort', 'culture', 'The 18th-century sandstone fort of the Maharaja of Banaras on the east bank, with a museum of vintage cars and palanquins.', '{"lat":25.2694,"lng":83.0236}'::jsonb, 1.5, 75, 4, 'afternoon')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('7c945b3eb6c322789775b950', 'ec8aacf2d867515857867e00', 'Sankat Mochan Hanuman Temple', 'spiritual', 'A much-loved Hanuman temple founded by the poet-saint Tulsidas, known for its besan laddoo prasad.', '{"lat":25.2819,"lng":82.9994}'::jsonb, 1, 0, 4.7, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('66dbb422d5a030ecf157a464', 'ec8aacf2d867515857867e00', 'Kachori Gali Food Walk', 'food', 'A tasting trail of kachori-sabzi, tamatar chaat, malaiyo and lassi in the lanes behind Vishwanath temple.', '{"lat":25.3115,"lng":83.0123}'::jsonb, 1.5, 0, 4.5, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('406b28434e8a3fd97c811841', 'ec8aacf2d867515857867e00', 'Thatheri Bazaar', 'shopping', 'A lane of brassware and copperware workshops, close to the wholesale shops for Banarasi silk saris.', '{"lat":25.312,"lng":83.011}'::jsonb, 1.5, 0, 4.2, 'afternoon')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('3c68b7b9f15c79236e938e4b', 'b81314865858cca4f39421ec', 'Tiger Hill', 'nature', 'The 2,590 m viewpoint famous for first light on Kanchenjunga; on a clear day Everest is visible too. Leave by 4 am for sunrise.', '{"lat":26.9949,"lng":88.2853}'::jsonb, 2.5, 50, 4.6, 'morning')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('b74988aee1da29288aa11b60', 'b81314865858cca4f39421ec', 'Batasia Loop', 'sightseeing', 'A spiral of the toy-train track around a garden and the Gorkha war memorial, with Kanchenjunga as backdrop.', '{"lat":27.0167,"lng":88.247}'::jsonb, 1, 20, 4.3, 'morning')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('bc00580da3165e377b67f5ff', 'b81314865858cca4f39421ec', 'Ghoom Monastery', 'spiritual', 'The Yiga Choeling gompa of 1850, with a 4.5 m statue of the Maitreya Buddha and old Tibetan manuscripts.', '{"lat":27.0115,"lng":88.251}'::jsonb, 1, 0, 4.4, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('1f03eb7517ca6247c047269f', 'b81314865858cca4f39421ec', 'Toy Train Joy Ride', 'sightseeing', 'A two-hour round trip on the UNESCO-listed Darjeeling Himalayan Railway to Ghum, India’s highest station.', '{"lat":27.038,"lng":88.2627}'::jsonb, 2, 1500, 4.5, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('34b0e03aa0793fa8d1088360', 'b81314865858cca4f39421ec', 'Himalayan Zoo and Mountaineering Institute', 'nature', 'Padmaja Naidu zoo breeds red pandas and snow leopards; the same ticket covers the HMI museum founded after Tenzing’s Everest climb.', '{"lat":27.0587,"lng":88.2545}'::jsonb, 2.5, 110, 4.5, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('e77bec5c1319378adf048bc2', 'b81314865858cca4f39421ec', 'Happy Valley Tea Estate', 'culture', 'A working estate from 1854 just below town, with a guided factory tour on withering, rolling and grading, and a tasting.', '{"lat":27.0511,"lng":88.2585}'::jsonb, 1.5, 100, 4.3, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('6373a139d827d51f7dd0ed97', 'b81314865858cca4f39421ec', 'Darjeeling Ropeway', 'adventure', 'A cable car from Singamari down over the tea gardens of the Rangeet valley and back.', '{"lat":27.0613,"lng":88.2539}'::jsonb, 1.5, 200, 4.2, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('de3a53f4d4c89fea443bfb62', 'b81314865858cca4f39421ec', 'Japanese Peace Pagoda', 'spiritual', 'A white Nipponzan Myohoji stupa with four gilded Buddha images, beside a small Japanese temple on Jalapahar hill.', '{"lat":27.0276,"lng":88.259}'::jsonb, 1, 0, 4.5, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('cfd7a22a3416f0c4d221a7bc', 'b81314865858cca4f39421ec', 'Glenary’s and Keventer’s', 'food', 'Two colonial-era institutions on Nehru Road: a bakery-tearoom and a terrace cafe known for its English breakfast.', '{"lat":27.0435,"lng":88.2665}'::jsonb, 1, 0, 4.4, 'afternoon')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('8a30a2ce1e7a1fb4752f7dec', 'b81314865858cca4f39421ec', 'Chowrasta and Mall Road', 'shopping', 'The traffic-free promenade at the top of the ridge, lined with tea shops, bookshops and curio stores.', '{"lat":27.0453,"lng":88.2675}'::jsonb, 1.5, 0, 4.4, 'evening')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('1345db91e7fbb21bdd648c13', 'f4b3860d5fb44fa3f8b28e1b', 'Jaisalmer Fort', 'culture', 'The 12th-century Sonar Quila, a living fort of yellow sandstone with the Raj Mahal palace museum inside its 99 bastions.', '{"lat":26.9124,"lng":70.9126}'::jsonb, 3, 100, 4.5, 'morning')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('e370082a1cb0ed3863c55850', 'f4b3860d5fb44fa3f8b28e1b', 'Jain Temples of Jaisalmer Fort', 'spiritual', 'Seven interconnected 15th-century temples inside the fort with finely carved sandstone. Open to visitors until noon.', '{"lat":26.9118,"lng":70.911}'::jsonb, 1, 50, 4.5, 'morning')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('5426c55a636820a843979c20', 'f4b3860d5fb44fa3f8b28e1b', 'Patwon Ki Haveli', 'culture', 'A cluster of five merchant mansions with sixty carved balconies, the most elaborate havelis in the city.', '{"lat":26.9165,"lng":70.9149}'::jsonb, 1, 50, 4.4, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('9b1d34cefa10c8d0747220a8', 'f4b3860d5fb44fa3f8b28e1b', 'Gadisar Lake', 'nature', 'A 14th-century rainwater reservoir ringed by shrines and chhatris, with paddle boats and winter birdlife.', '{"lat":26.909,"lng":70.922}'::jsonb, 1, 0, 4.4, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('2e4aea804f3c2152e0f23f9a', 'f4b3860d5fb44fa3f8b28e1b', 'Bada Bagh', 'sightseeing', 'Rows of royal cenotaphs on a low hill north of the city, beside an old dam and mango grove.', '{"lat":26.954,"lng":70.887}'::jsonb, 1, 100, 4.2, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('5e0a0bf2de54906c7608eac4', 'f4b3860d5fb44fa3f8b28e1b', 'Kuldhara Abandoned Village', 'culture', 'The ruins of a Paliwal Brahmin village deserted overnight in the early 1800s, now a protected heritage site.', '{"lat":26.8699,"lng":70.7851}'::jsonb, 1.5, 50, 4.2, 'afternoon')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('f5e3aeb679889568a266ece0', 'f4b3860d5fb44fa3f8b28e1b', 'Sam Sand Dunes Camel Safari', 'adventure', 'A camel ride onto the Thar dunes for sunset, followed by folk music and dinner at a desert camp.', '{"lat":26.829,"lng":70.504}'::jsonb, 4, 800, 4.6, 'evening')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('3172b303fdf1ad99a3129c41', 'f4b3860d5fb44fa3f8b28e1b', 'Desert National Park', 'nature', 'A jeep safari near Sudasari through scrub and dunes, one of the last habitats of the great Indian bustard.', '{"lat":26.72,"lng":70.61}'::jsonb, 3, 600, 4.2, 'morning')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('571b401808f576b2d63e729a', 'f4b3860d5fb44fa3f8b28e1b', 'Vyas Chhatri', 'sightseeing', 'Sandstone cenotaphs on the edge of town dedicated to sage Vyasa, a favourite spot to watch the fort glow at sunset.', '{"lat":26.923,"lng":70.903}'::jsonb, 1, 50, 4.2, 'evening')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('c86613129ffa68b4288c0fac', 'f4b3860d5fb44fa3f8b28e1b', 'Sadar Bazaar Jaisalmer', 'shopping', 'The main market below the fort for mirror-work textiles, camel-leather bags, silver and carved stone.', '{"lat":26.915,"lng":70.915}'::jsonb, 1.5, 0, 4.1, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('a3df8698f12508b2564d8e4a', 'c029d5c60201a18065ed9b98', 'White Rann at Dhordo', 'nature', 'The endless salt flat of the Great Rann, walked at sunset or under a full moon. A permit is issued at Bhirandiyara check post.', '{"lat":23.8304,"lng":69.5201}'::jsonb, 3, 100, 4.7, 'evening')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('acaa1ffff2f26ed5792f6eed', 'c029d5c60201a18065ed9b98', 'Kalo Dungar', 'nature', 'The Black Hill, highest point in Kutch at 462 m, with a Dattatreya temple and a panorama of the Rann.', '{"lat":23.936,"lng":69.81}'::jsonb, 1.5, 0, 4.5, 'afternoon')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('7b0398e1f721acc37498866b', 'c029d5c60201a18065ed9b98', 'Aina Mahal and Prag Mahal', 'culture', 'The 18th-century Hall of Mirrors and the neighbouring Italian-Gothic palace with a clock tower, in the old Darbargadh of Bhuj.', '{"lat":23.254,"lng":69.668}'::jsonb, 2, 70, 4.3, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('e6dabf3da0c49c47fb8dd70f', 'c029d5c60201a18065ed9b98', 'Smritivan Earthquake Memorial', 'culture', 'A memorial park and museum on Bhujiyo hill dedicated to the victims of the 2001 earthquake, with immersive galleries.', '{"lat":23.2459,"lng":69.6945}'::jsonb, 2.5, 300, 4.7, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('dbdbb385b2d71c371dd03b9f', 'c029d5c60201a18065ed9b98', 'Shree Swaminarayan Temple Bhuj', 'spiritual', 'A marble temple rebuilt after the earthquake, with finely carved domes and pillars, close to Hamirsar Lake.', '{"lat":23.2463,"lng":69.6646}'::jsonb, 1, 0, 4.6, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('49a7dd06b75cc98048501728', 'c029d5c60201a18065ed9b98', 'Bhujodi Weavers’ Village', 'shopping', 'A Vankar weaving community east of Bhuj where you can watch handloom shawls being made and buy directly from the artisans.', '{"lat":23.2248,"lng":69.7346}'::jsonb, 1.5, 0, 4.4, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('470b41cc8c4045ae8525c8c6', 'c029d5c60201a18065ed9b98', 'Nirona Craft Village', 'culture', 'Home of the last family practising Rogan painting, along with copper-bell makers and lacquer-work artisans.', '{"lat":23.4651,"lng":69.5242}'::jsonb, 1.5, 0, 4.4, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('a2e341157940bd07a2b0114f', 'c029d5c60201a18065ed9b98', 'Vijay Vilas Palace', 'culture', 'A 1920s red-sandstone summer palace of the Kutch rulers at Mandvi, with a rooftop view to the sea.', '{"lat":22.835,"lng":69.286}'::jsonb, 1.5, 50, 4.4, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('d24a74935f340f11db7f9e39', 'c029d5c60201a18065ed9b98', 'Mandvi Beach', 'nature', 'A clean, windy beach lined with windmills, with camel rides and dabeli stalls. The wooden-ship yard is nearby on the Rukmavati.', '{"lat":22.8256,"lng":69.3381}'::jsonb, 2, 0, 4.6, 'evening')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('978d0dfd5e900f0b421ee6e3', 'c029d5c60201a18065ed9b98', 'Dholavira', 'culture', 'The excavated Harappan city on Khadir island with reservoirs, a citadel and a signboard in Indus script. A UNESCO World Heritage Site and a full-day trip from Bhuj.', '{"lat":23.887,"lng":70.213}'::jsonb, 6, 0, 4.6, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('5da31bbee1d89030f4752758', '6988e0e8dd77fe5a45ef6fa2', 'Leh Palace', 'culture', 'A nine-storey 17th-century royal palace modelled on the Potala, overlooking the old town and the Stok range.', '{"lat":34.166,"lng":77.586}'::jsonb, 1.5, 25, 4.3, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('a413b7efcafccc71d26c9f19', '6988e0e8dd77fe5a45ef6fa2', 'Shanti Stupa', 'spiritual', 'A white-domed peace pagoda on Changspa hill, best at sunset when the whole Leh valley lights up.', '{"lat":34.1738,"lng":77.5745}'::jsonb, 1, 0, 4.6, 'evening')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('2cd7994287ec095c8fcca824', '6988e0e8dd77fe5a45ef6fa2', 'Leh Main Bazaar', 'shopping', 'The pedestrianised market below the palace for pashmina, turquoise jewellery, prayer flags and dried apricots.', '{"lat":34.164,"lng":77.585}'::jsonb, 1.5, 0, 4.3, 'evening')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('600091865e664c4864a84a30', '6988e0e8dd77fe5a45ef6fa2', 'Hall of Fame', 'culture', 'An Indian Army museum honouring soldiers of the Ladakh wars, with Siachen gear and a moving evening ceremony.', '{"lat":34.139,"lng":77.556}'::jsonb, 1.5, 100, 4.7, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('11346180e71e6a3250548d9a', '6988e0e8dd77fe5a45ef6fa2', 'Thiksey Monastery', 'spiritual', 'A twelve-storey Gelugpa monastery stepping up a hillside, with a 15 m Maitreya Buddha and morning prayers open to visitors.', '{"lat":34.0568,"lng":77.667}'::jsonb, 2, 50, 4.7, 'morning')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('bee3c14187a5f40fae1ba747', '6988e0e8dd77fe5a45ef6fa2', 'Hemis Monastery', 'culture', 'The largest and wealthiest monastery in Ladakh, hidden in a side gorge, with a museum of thangkas and ritual masks.', '{"lat":33.9125,"lng":77.703}'::jsonb, 2, 100, 4.6, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('c8bdcad0b8b83ffa7a3b27c2', '6988e0e8dd77fe5a45ef6fa2', 'Magnetic Hill and Gurudwara Pathar Sahib', 'sightseeing', 'A stretch of the Srinagar highway where an optical illusion makes vehicles appear to roll uphill, next to the army-run Pathar Sahib gurudwara.', '{"lat":34.171,"lng":77.3525}'::jsonb, 1.5, 0, 4.3, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('2e3a67d4cd7933866cb1ddae', '6988e0e8dd77fe5a45ef6fa2', 'Sangam Rafting at Nimmu', 'adventure', 'Rafting on the Zanskar down to its confluence with the Indus at Nimmu, where the two rivers meet in different colours.', '{"lat":34.165,"lng":77.333}'::jsonb, 3, 1800, 4.5, 'any')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('338d7cf481bb767e4056cce6', '6988e0e8dd77fe5a45ef6fa2', 'Khardung La', 'adventure', 'A 5,359 m motorable pass on the road to Nubra, a rite of passage for bikers. Limit the stop at the top to 20 minutes.', '{"lat":34.2787,"lng":77.6047}'::jsonb, 4, 0, 4.6, 'morning')
on conflict (id) do nothing;
insert into public.activities (id, destination_id, name, type, description, location, duration_hours, entry_fee, rating, best_time)
values ('a013348ff3d4a76d9a338e95', '6988e0e8dd77fe5a45ef6fa2', 'Pangong Tso', 'nature', 'A 134 km long lake at 4,350 m whose water shifts from turquoise to deep blue. A full-day excursion over Chang La; the fee covers the inner line permit.', '{"lat":33.905,"lng":78.455}'::jsonb, 6, 400, 4.8, 'morning')
on conflict (id) do nothing;
