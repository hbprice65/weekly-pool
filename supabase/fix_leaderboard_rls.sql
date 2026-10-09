-- Fix Leaderboard RLS: Allow all pool members to view picks & tiebreakers on the Leaderboard
-- Run this in your Supabase SQL Editor: Dashboard > SQL Editor > New Query > Run

-- 1. Allow everyone in the pool to view picks for leaderboard calculations
drop policy if exists "Users can view their own picks." on public.picks;
drop policy if exists "Users can view others picks after kickoff." on public.picks;
drop policy if exists "Picks are viewable by everyone." on public.picks;
create policy "Picks are viewable by everyone." on public.picks for select using (true);

-- 2. Allow everyone to view tiebreaker score predictions
drop policy if exists "Users can view their own tiebreakers." on public.tiebreakers;
drop policy if exists "Tiebreakers are viewable by everyone." on public.tiebreakers;
create policy "Tiebreakers are viewable by everyone." on public.tiebreakers for select using (true);

-- 3. Ensure profiles are viewable by everyone
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
