-- ==============================================================================
-- NFL WEEKLY POOL (V2) - PRODUCTION & MULTI-SPORT EXTENSIBLE SCHEMA
-- 
-- Run this in your Supabase SQL Editor:
-- Dashboard > SQL Editor > New Query > Paste & Run
-- Direct Link: https://supabase.com/dashboard/project/kweiahuyxdvupsglfhzl/sql/new
-- ==============================================================================

-- 1. DROP LEGACY TABLES & VIEWS
drop table if exists public.picks cascade;
drop table if exists public.tiebreakers cascade;
drop table if exists public.pool_tiebreakers cascade;
drop table if exists public.pool_members cascade;
drop table if exists public.pools cascade;
drop table if exists public.games cascade;
drop table if exists public.weeks cascade;
drop table if exists public.profiles cascade;

-- 2. USER PROFILES TABLE
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Backfill profiles from existing auth.users (if any)
insert into public.profiles (id, display_name, avatar_url)
select 
  id, 
  coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1), 'Pool Member') as display_name,
  raw_user_meta_data->>'avatar_url' as avatar_url
from auth.users
on conflict (id) do update 
set 
  display_name = excluded.display_name,
  avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);

-- 3. POOLS TABLE (Multi-Sport, Multi-League, Multi-Format)
create table public.pools (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text unique not null,
  description text,
  sport text not null default 'football',        -- 'football', 'basketball', 'baseball', 'soccer', etc.
  league text not null default 'nfl',             -- 'nfl', 'ncaaf', 'nba', 'mlb', 'epl', etc.
  format text not null default 'straight_up',     -- 'straight_up', 'against_spread', 'survivor', 'confidence'
  season_year int not null default 2026,
  is_public boolean default true not null,
  join_code text,
  creator_id uuid references auth.users(id) on delete set null,
  settings jsonb default '{"tiebreaker": "mnf_total_points", "drop_lowest_weeks": 0, "lock_rule": "kickoff"}'::jsonb,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Seed Default Public Pool for 2026 NFL Season
insert into public.pools (id, name, slug, description, sport, league, format, season_year, is_public)
values (
  '00000000-0000-0000-0000-000000000001',
  '2026 NFL Weekly Pick''em',
  'nfl-2026-weekly',
  'Official season-long straight-up NFL pick''em with weekly scoreboard and tiebreakers.',
  'football',
  'nfl',
  'straight_up',
  2026,
  true
)
on conflict (id) do nothing;

-- 4. POOL MEMBERS TABLE (Tracks which users belong to which pools)
create table public.pool_members (
  pool_id uuid references public.pools(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null default 'member', -- 'admin', 'member'
  joined_at timestamptz default now() not null,
  primary key (pool_id, user_id)
);

-- Enroll all current users into default featured pool
insert into public.pool_members (pool_id, user_id, role)
select '00000000-0000-0000-0000-000000000001', id, 'member'
from auth.users
on conflict do nothing;

-- 5. MATCHUPS / GAMES TABLE (Normalized for any sport or live API feed)
create table public.games (
  id text primary key, -- e.g. "401671802" (ESPN ID) or provider event ID
  sport text not null default 'football',
  league text not null default 'nfl',
  season_year int not null default 2026,
  week_number int not null,
  away_team text not null,
  home_team text not null,
  kickoff_time timestamptz not null,
  status text not null default 'SCHEDULED', -- 'SCHEDULED', 'IN_PROGRESS', 'FINAL'
  status_detail text,
  away_score int,
  home_score int,
  winner_team text,
  spread numeric,
  is_monday_night boolean default false,
  tv_network text,
  metadata jsonb default '{}'::jsonb,
  updated_at timestamptz default now() not null
);

create index if not exists idx_games_lookup on public.games(league, season_year, week_number);
create index if not exists idx_games_kickoff on public.games(kickoff_time);

-- 6. PICKS TABLE (Flexible per pool and user)
create table public.picks (
  id uuid default gen_random_uuid() primary key,
  pool_id uuid references public.pools(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  game_id text not null,
  week_number int not null,
  selected_team text not null,
  is_correct boolean,
  points int default 0,
  updated_at timestamptz default now() not null,
  constraint unique_pool_user_game unique (pool_id, user_id, game_id)
);

create index if not exists idx_picks_pool_week on public.picks(pool_id, week_number);
create index if not exists idx_picks_user on public.picks(user_id);

-- 7. TIEBREAKERS TABLE (Weekly MNF predictions per pool)
create table public.tiebreakers (
  id uuid default gen_random_uuid() primary key,
  pool_id uuid references public.pools(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  week_number int not null,
  predicted_score int not null,
  predicted_mnf_score int,
  updated_at timestamptz default now() not null,
  constraint unique_pool_user_week_tiebreaker unique (pool_id, user_id, week_number)
);

create index if not exists idx_tiebreakers_pool_week on public.tiebreakers(pool_id, week_number);

-- 8. AUTOMATIC PROFILE CREATION & POOL ENROLLMENT TRIGGER
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- Auto-create Profile
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), 'Pool Member'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
  set
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);

  -- Auto-enroll into featured default pool
  insert into public.pool_members (pool_id, user_id, role)
  values ('00000000-0000-0000-0000-000000000001', new.id, 'member')
  on conflict do nothing;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 9. BULLETPROOF ROW LEVEL SECURITY (RLS) POLICIES
alter table public.profiles enable row level security;
alter table public.pools enable row level security;
alter table public.pool_members enable row level security;
alter table public.games enable row level security;
alter table public.picks enable row level security;
alter table public.tiebreakers enable row level security;

-- Profiles: Public select, self-manage
create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Pools: Public select, authenticated create, creator manage
create policy "Pools are viewable by everyone"
  on public.pools for select using (true);
create policy "Authenticated users can create pools"
  on public.pools for insert with check (auth.uid() is not null);
create policy "Creators can update own pools"
  on public.pools for update using (auth.uid() = creator_id);

-- Pool Members: Public select, self-enroll
-- Pool Members: Public select, self-enroll strictly as member
create policy "Pool members are viewable by everyone"
  on public.pool_members for select using (true);
create policy "Users can join pools"
  on public.pool_members for insert with check (auth.uid() = user_id and role = 'member');
create policy "Users can leave pools"
  on public.pool_members for delete using (auth.uid() = user_id);

-- Games: Public read-only; admin/server manages schedule
create policy "Games are viewable by everyone"
  on public.games for select using (true);

-- Picks: Privacy before kickoff; deadline enforcement
create policy "Users can view picks"
  on public.picks for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.games
      where games.id = picks.game_id
      and games.kickoff_time <= now()
    )
  );

create policy "Users can insert their own picks"
  on public.picks for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.games
      where games.id = picks.game_id
      and games.kickoff_time > now()
    )
  );

create policy "Users can update their own picks"
  on public.picks for update
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.games
      where games.id = picks.game_id
      and games.kickoff_time > now()
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.games
      where games.id = picks.game_id
      and games.kickoff_time > now()
    )
  );

create policy "Users can delete their own picks"
  on public.picks for delete
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.games
      where games.id = picks.game_id
      and games.kickoff_time > now()
    )
  );

-- Tiebreakers: Hidden until Monday Night Football kickoff
create or replace function public.is_week_tiebreaker_locked(p_week int)
returns boolean as $$
  select coalesce(
    (
      select min(kickoff_time) <= now()
      from public.games
      where week_number = p_week and is_monday_night = true
    ),
    (
      select max(kickoff_time) <= now()
      from public.games
      where week_number = p_week
    ),
    false
  );
$$ language sql stable security definer;

create policy "Users can view tiebreakers"
  on public.tiebreakers for select
  using (
    auth.uid() = user_id
    or public.is_week_tiebreaker_locked(week_number) = true
  );

create policy "Users can insert their own tiebreakers"
  on public.tiebreakers for insert
  with check (
    auth.uid() = user_id
    and public.is_week_tiebreaker_locked(week_number) = false
  );

create policy "Users can update their own tiebreakers"
  on public.tiebreakers for update
  using (
    auth.uid() = user_id
    and public.is_week_tiebreaker_locked(week_number) = false
  )
  with check (
    auth.uid() = user_id
    and public.is_week_tiebreaker_locked(week_number) = false
  );
