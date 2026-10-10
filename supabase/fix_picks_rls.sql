-- ==============================================================================
-- FIX PICKS & DATABASE RLS POLICIES FOR NFL WEEKLY POOL
-- Run this in your Supabase SQL Editor:
-- Dashboard > SQL Editor > New Query > Paste & Run
-- Direct Link: https://supabase.com/dashboard/project/kweiahuyxdvupsglfhzl/sql/new
-- ==============================================================================

-- 1. DROP RESTRICTIVE FOREIGN KEY CONSTRAINTS
-- Ensures dynamic NFL schedule / ESPN game IDs never fail if games sync asynchronously
alter table public.picks drop constraint if exists picks_game_id_fkey;
alter table public.tiebreakers drop constraint if exists tiebreakers_week_number_fkey;

-- 2. FIX TABLE: public.picks
alter table public.picks enable row level security;

-- Drop all old restrictive / legacy policies
drop policy if exists "Users can manage picks before kickoff." on public.picks;
drop policy if exists "Users can update picks before kickoff." on public.picks;
drop policy if exists "Users can view their own picks." on public.picks;
drop policy if exists "Users can view others picks after kickoff." on public.picks;
drop policy if exists "Picks are viewable by everyone." on public.picks;
drop policy if exists "Users can insert their own picks." on public.picks;
drop policy if exists "Users can update their own picks." on public.picks;
drop policy if exists "Users can delete their own picks." on public.picks;
drop policy if exists "Users can manage their own picks." on public.picks;

-- Policy A: Everyone can view picks (needed for leaderboard & scoreboard matrix)
create policy "Picks are viewable by everyone."
  on public.picks for select
  using (true);

-- Policy B: Authenticated users can insert their own picks
create policy "Users can insert their own picks."
  on public.picks for insert
  with check (auth.uid() = user_id);

-- Policy C: Authenticated users can update their own picks
create policy "Users can update their own picks."
  on public.picks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Policy D: Authenticated users can delete their own picks
create policy "Users can delete their own picks."
  on public.picks for delete
  using (auth.uid() = user_id);


-- 3. FIX TABLE: public.tiebreakers
alter table public.tiebreakers enable row level security;

drop policy if exists "Users can manage their own tiebreakers." on public.tiebreakers;
drop policy if exists "Tiebreakers are viewable by everyone." on public.tiebreakers;
drop policy if exists "Users can view their own tiebreakers." on public.tiebreakers;
drop policy if exists "Users can insert their own tiebreakers." on public.tiebreakers;
drop policy if exists "Users can update their own tiebreakers." on public.tiebreakers;

create policy "Tiebreakers are viewable by everyone."
  on public.tiebreakers for select
  using (true);

create policy "Users can insert their own tiebreakers."
  on public.tiebreakers for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own tiebreakers."
  on public.tiebreakers for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- 4. FIX TABLE: public.games (Allows live schedule sync from ESPN)
alter table public.games enable row level security;

drop policy if exists "Games are viewable by everyone." on public.games;
drop policy if exists "Allow insert on games" on public.games;
drop policy if exists "Allow update on games" on public.games;
drop policy if exists "Allow all on games" on public.games;

create policy "Games are viewable by everyone."
  on public.games for select
  using (true);

create policy "Allow all on games"
  on public.games for all
  using (true)
  with check (true);


-- 5. FIX TABLE: public.weeks
alter table public.weeks enable row level security;

drop policy if exists "Weeks are viewable by all authenticated users." on public.weeks;
drop policy if exists "Weeks are viewable by everyone." on public.weeks;
drop policy if exists "Allow insert on weeks" on public.weeks;
drop policy if exists "Allow update on weeks" on public.weeks;
drop policy if exists "Allow all on weeks" on public.weeks;

create policy "Weeks are viewable by everyone."
  on public.weeks for select
  using (true);

create policy "Allow all on weeks"
  on public.weeks for all
  using (true)
  with check (true);


-- 6. FIX TABLE: public.profiles
alter table public.profiles enable row level security;

drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
drop policy if exists "Users can update their own profile." on public.profiles;
drop policy if exists "Users can insert their own profile." on public.profiles;

create policy "Public profiles are viewable by everyone."
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile."
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile."
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
