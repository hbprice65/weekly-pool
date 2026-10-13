-- ==============================================================================
-- NFL WEEKLY POOL - FIX FOR GAMES SYNC & PICKS RLS (WEEK 6+ SUPPORT)
-- 
-- Run this in your Supabase SQL Editor:
-- Dashboard > SQL Editor > New Query > Paste & Run
-- Direct Link: https://supabase.com/dashboard/project/kweiahuyxdvupsglfhzl/sql/new
-- ==============================================================================

-- 1. ALLOW GAMES TO BE INSERTED AND UPDATED (Synchronizes new weeks from ESPN)
drop policy if exists "Games can be synced" on public.games;
drop policy if exists "Games can be inserted and synced" on public.games;
drop policy if exists "Games can be updated and synced" on public.games;
drop policy if exists "Allow all on games" on public.games;
drop policy if exists "Allow insert on games" on public.games;
drop policy if exists "Allow update on games" on public.games;

create policy "Games can be inserted and synced"
  on public.games for insert
  with check (true);

create policy "Games can be updated and synced"
  on public.games for update
  using (true)
  with check (true);

-- 2. HARDEN PICKS RLS: Protect completed games while supporting new schedule slates
drop policy if exists "Users can insert picks before kickoff" on public.picks;
drop policy if exists "Users can update picks before kickoff" on public.picks;
drop policy if exists "Users can manage picks before kickoff" on public.picks;

create policy "Users can insert picks before kickoff"
  on public.picks for insert
  with check (
    auth.uid() = user_id
    and (
      not exists (select 1 from public.games where games.id = picks.game_id)
      or exists (
        select 1 from public.games
        where games.id = picks.game_id
        and games.kickoff_time > now()
      )
    )
  );

create policy "Users can update picks before kickoff"
  on public.picks for update
  using (
    auth.uid() = user_id
    and (
      not exists (select 1 from public.games where games.id = picks.game_id)
      or exists (
        select 1 from public.games
        where games.id = picks.game_id
        and games.kickoff_time > now()
      )
    )
  )
  with check (
    auth.uid() = user_id
    and (
      not exists (select 1 from public.games where games.id = picks.game_id)
      or exists (
        select 1 from public.games
        where games.id = picks.game_id
        and games.kickoff_time > now()
      )
    )
  );

-- 3. ENSURE TIEBREAKERS CAN BE SUBMITTED FOR NEW WEEKS
drop policy if exists "Users can insert tiebreakers before kickoff" on public.tiebreakers;
drop policy if exists "Users can update tiebreakers before kickoff" on public.tiebreakers;

create policy "Users can insert tiebreakers before kickoff"
  on public.tiebreakers for insert
  with check (
    auth.uid() = user_id
    and not public.is_week_tiebreaker_locked(week_number)
  );

create policy "Users can update tiebreakers before kickoff"
  on public.tiebreakers for update
  using (
    auth.uid() = user_id
    and not public.is_week_tiebreaker_locked(week_number)
  )
  with check (
    auth.uid() = user_id
    and not public.is_week_tiebreaker_locked(week_number)
  );
