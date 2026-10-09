-- Seed Script: NFL Week 6 Matchups and Schedule
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query > Run)

-- 1. Ensure public select access on weeks and games
drop policy if exists "Weeks are viewable by all authenticated users." on public.weeks;
drop policy if exists "Weeks are viewable by everyone." on public.weeks;
create policy "Weeks are viewable by everyone." on public.weeks for select using (true);

drop policy if exists "Games are viewable by everyone." on public.games;
create policy "Games are viewable by everyone." on public.games for select using (true);

-- Allow upsert on weeks and games
drop policy if exists "Allow insert on weeks" on public.weeks;
create policy "Allow insert on weeks" on public.weeks for insert with check (true);

drop policy if exists "Allow insert on games" on public.games;
create policy "Allow insert on games" on public.games for insert with check (true);

-- Ensure tiebreakers and picks support UPSERT with check
drop policy if exists "Users can manage their own tiebreakers." on public.tiebreakers;
create policy "Users can view their own tiebreakers." on public.tiebreakers for select using (auth.uid() = user_id);
create policy "Users can insert their own tiebreakers." on public.tiebreakers for insert with check (auth.uid() = user_id);
create policy "Users can update their own tiebreakers." on public.tiebreakers for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can update picks before kickoff." on public.picks;
create policy "Users can update picks before kickoff." on public.picks for update 
  using (
    auth.uid() = user_id and 
    exists (select 1 from public.games where games.id = picks.game_id and games.kickoff_time > now())
  )
  with check (
    auth.uid() = user_id and 
    exists (select 1 from public.games where games.id = picks.game_id and games.kickoff_time > now())
  );

-- 2. Insert Week 6
insert into public.weeks (week_number, season_year, title, start_date, end_date, lock_date, is_current, is_completed)
values (
  6,
  2026,
  'Week 6',
  '2026-10-15T00:00:00Z',
  '2026-10-20T05:00:00Z',
  '2026-10-15T20:15:00Z',
  true,
  false
)
on conflict (week_number) do update set
  title = excluded.title,
  start_date = excluded.start_date,
  end_date = excluded.end_date,
  lock_date = excluded.lock_date,
  is_current = excluded.is_current,
  is_completed = excluded.is_completed;

-- 3. Insert Week 6 Matchups
insert into public.games (id, week_number, season_year, away_team, home_team, kickoff_time, status, spread, tv_network, is_monday_night)
values
  ('g1', 6, 2026, 'SF', 'SEA', '2026-10-15T20:15:00Z', 'SCHEDULED', -3.5, 'Prime Video', false),
  ('g2', 6, 2026, 'JAX', 'CHI', '2026-10-18T09:30:00Z', 'SCHEDULED', 1.5, 'NFL Network', false),
  ('g3', 6, 2026, 'WAS', 'BAL', '2026-10-18T13:00:00Z', 'SCHEDULED', -6.5, 'CBS', false),
  ('g4', 6, 2026, 'HOU', 'NE', '2026-10-18T13:00:00Z', 'SCHEDULED', -7.0, 'CBS', false),
  ('g5', 6, 2026, 'TB', 'NO', '2026-10-18T13:00:00Z', 'SCHEDULED', -3.5, 'FOX', false),
  ('g6', 6, 2026, 'CLE', 'PHI', '2026-10-18T13:00:00Z', 'SCHEDULED', -9.5, 'FOX', false),
  ('g7', 6, 2026, 'DET', 'DAL', '2026-10-18T16:25:00Z', 'SCHEDULED', -3.0, 'FOX', false),
  ('g8', 6, 2026, 'CIN', 'NYG', '2026-10-18T20:20:00Z', 'SCHEDULED', -3.5, 'NBC', false),
  ('g9', 6, 2026, 'BUF', 'NYJ', '2026-10-19T20:15:00Z', 'SCHEDULED', 2.5, 'ESPN', true)
on conflict (id) do update set
  week_number = excluded.week_number,
  away_team = excluded.away_team,
  home_team = excluded.home_team,
  kickoff_time = excluded.kickoff_time,
  status = excluded.status,
  spread = excluded.spread,
  tv_network = excluded.tv_network,
  is_monday_night = excluded.is_monday_night;
