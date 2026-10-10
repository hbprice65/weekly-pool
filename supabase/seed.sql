-- ==============================================================================
-- NFL WEEKLY POOL - SAMPLE / SEED DATA
-- 
-- Note: Live games, kickoff times, and scores are automatically synchronized
-- from official ESPN schedules via the application API.
--
-- To set up the database schema, run 'supabase/schema_v2.sql'.
-- To enforce security policies, run 'supabase/security_hardening.sql'.
-- ==============================================================================

-- Example: Seed Featured 2026 NFL Weekly Pick'em Contest
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
