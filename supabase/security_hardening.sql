-- ==============================================================================
-- NFL WEEKLY POOL - COMPREHENSIVE SECURITY HARDENING MIGRATION
-- 
-- Run this in your Supabase SQL Editor:
-- Dashboard > SQL Editor > New Query > Paste & Run
-- Direct Link: https://supabase.com/dashboard/project/kweiahuyxdvupsglfhzl/sql/new
-- ==============================================================================

-- 1. HARDEN GAMES & WEEKS (Revoke open public write access)
-- Anonymous & authenticated users can ONLY view schedules and scores.
-- Mutating games/scores is strictly reserved for the server / service role.
drop policy if exists "Allow all on games" on public.games;
drop policy if exists "Games can be synced" on public.games;
drop policy if exists "Allow insert on games" on public.games;
drop policy if exists "Allow update on games" on public.games;
drop policy if exists "Games are viewable by everyone" on public.games;

create policy "Games are viewable by everyone"
  on public.games for select
  using (true);

-- Harden weeks table if present in schema
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'weeks') then
    execute 'drop policy if exists "Allow all on weeks" on public.weeks';
    execute 'drop policy if exists "Allow insert on weeks" on public.weeks';
    execute 'drop policy if exists "Allow update on weeks" on public.weeks';
    execute 'drop policy if exists "Weeks are viewable by everyone" on public.weeks';
    execute 'create policy "Weeks are viewable by everyone" on public.weeks for select using (true)';
  end if;
end $$;


-- 2. TIEBREAKER LOCK HELPER FUNCTION
-- Accurately identifies whether the week's tiebreaker matchup has kicked off
create or replace function public.is_week_tiebreaker_locked(p_week int)
returns boolean as $$
  select coalesce(
    (
      -- Check kickoff time of Monday Night Football matchup
      select min(kickoff_time) <= now()
      from public.games
      where week_number = p_week and is_monday_night = true
    ),
    (
      -- Fallback to latest kickoff of that week if no MNF flagged
      select max(kickoff_time) <= now()
      from public.games
      where week_number = p_week
    ),
    false
  );
$$ language sql stable security definer;


-- 3. HARDEN PICKS TABLE
-- A. Prevent pick-snooping: Users can only see their own picks before kickoff.
--    After each game kicks off, picks become public for live transparency.
-- B. Prevent late picks: Picks cannot be inserted or edited after game kickoff.
alter table public.picks enable row level security;

drop policy if exists "Picks are viewable by everyone." on public.picks;
drop policy if exists "Picks are viewable by everyone" on public.picks;
drop policy if exists "Users can view their own picks." on public.picks;
drop policy if exists "Users can view others picks after kickoff." on public.picks;
drop policy if exists "Users can view picks" on public.picks;
drop policy if exists "Users can insert their own picks." on public.picks;
drop policy if exists "Users can insert their own picks" on public.picks;
drop policy if exists "Users can manage picks before kickoff." on public.picks;
drop policy if exists "Users can insert picks before kickoff" on public.picks;
drop policy if exists "Users can update their own picks." on public.picks;
drop policy if exists "Users can update their own picks" on public.picks;
drop policy if exists "Users can update picks before kickoff." on public.picks;
drop policy if exists "Users can update picks before kickoff" on public.picks;
drop policy if exists "Users can delete their own picks." on public.picks;
drop policy if exists "Users can delete their own picks" on public.picks;

-- Select Policy: Own picks always, others ONLY after kickoff
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

-- Insert Policy: Own picks, strictly BEFORE kickoff
create policy "Users can insert picks before kickoff"
  on public.picks for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.games
      where games.id = picks.game_id
      and games.kickoff_time > now()
    )
  );

-- Update Policy: Own picks, strictly BEFORE kickoff
create policy "Users can update picks before kickoff"
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

-- Delete Policy: Users can only remove their own unstarted picks
create policy "Users can delete picks before kickoff"
  on public.picks for delete
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.games
      where games.id = picks.game_id
      and games.kickoff_time > now()
    )
  );


-- 4. HARDEN TIEBREAKERS TABLE
-- Predictions remain 100% confidential until Monday Night Football kickoff.
alter table public.tiebreakers enable row level security;

drop policy if exists "Tiebreakers are viewable by everyone." on public.tiebreakers;
drop policy if exists "Tiebreakers are viewable by everyone" on public.tiebreakers;
drop policy if exists "Users can view their own tiebreakers." on public.tiebreakers;
drop policy if exists "Users can view tiebreakers" on public.tiebreakers;
drop policy if exists "Users can insert their own tiebreakers." on public.tiebreakers;
drop policy if exists "Users can insert their own tiebreakers" on public.tiebreakers;
drop policy if exists "Users can insert tiebreakers before kickoff" on public.tiebreakers;
drop policy if exists "Users can update their own tiebreakers." on public.tiebreakers;
drop policy if exists "Users can update their own tiebreakers" on public.tiebreakers;
drop policy if exists "Users can update tiebreakers before kickoff" on public.tiebreakers;
drop policy if exists "Users can manage their own tiebreakers." on public.tiebreakers;

-- Select Policy: Own prediction always, others ONLY after MNF kicks off
create policy "Users can view tiebreakers"
  on public.tiebreakers for select
  using (
    auth.uid() = user_id
    or public.is_week_tiebreaker_locked(week_number) = true
  );

-- Insert Policy: Before MNF kickoff only
create policy "Users can insert tiebreakers before kickoff"
  on public.tiebreakers for insert
  with check (
    auth.uid() = user_id
    and public.is_week_tiebreaker_locked(week_number) = false
  );

-- Update Policy: Before MNF kickoff only
create policy "Users can update tiebreakers before kickoff"
  on public.tiebreakers for update
  using (
    auth.uid() = user_id
    and public.is_week_tiebreaker_locked(week_number) = false
  )
  with check (
    auth.uid() = user_id
    and public.is_week_tiebreaker_locked(week_number) = false
  );


-- 5. ANTI-TAMPERING TRIGGERS (Prevent clients from forging is_correct or points)
create or replace function public.protect_pick_scores_on_update()
returns trigger as $$
begin
  if auth.role() = 'authenticated' then
    -- Reset any client-forged scoring columns to existing database values
    new.is_correct := old.is_correct;
    new.points := coalesce(old.points, 0);
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_protect_pick_scores_update on public.picks;
create trigger trg_protect_pick_scores_update
  before update on public.picks
  for each row execute function public.protect_pick_scores_on_update();

create or replace function public.protect_pick_scores_on_insert()
returns trigger as $$
begin
  if auth.role() = 'authenticated' then
    new.is_correct := null;
    new.points := 0;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_protect_pick_scores_insert on public.picks;
create trigger trg_protect_pick_scores_insert
  before insert on public.picks
  for each row execute function public.protect_pick_scores_on_insert();


-- 6. HARDEN POOL MEMBERS (Prevent self-promotion to admin)
alter table public.pool_members enable row level security;
drop policy if exists "Users can join pools" on public.pool_members;
drop policy if exists "Users can join pools as members" on public.pool_members;

create policy "Users can join pools as members"
  on public.pool_members for insert
  with check (
    auth.uid() = user_id
    and role = 'member'
  );

-- ==============================================================================
-- VERIFICATION CHECK:
-- Run: SELECT * FROM pg_policies WHERE schemaname = 'public';
-- ==============================================================================
