-- ==============================================================================
-- NFL PLAYOFFS FANTASY CHALLENGE SCHEMA & RLS POLICIES
-- ==============================================================================

-- 1. Create Playoff Lineups Table
create table if not exists public.playoff_lineups (
  id uuid default gen_random_uuid() primary key,
  pool_id uuid references public.pools(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  round int not null check (round between 1 and 4), -- 1: Wild Card, 2: Divisional, 3: Conf Finals, 4: Super Bowl
  slot text not null check (slot in ('QB', 'RB1', 'RB2', 'WR1', 'WR2', 'TE', 'K', 'DEF')),
  player_id text not null,
  player_name text not null,
  player_team text not null,
  player_position text not null,
  multiplier int not null default 1 check (multiplier between 1 and 4),
  base_points numeric(7,2) not null default 0.00,
  total_points numeric(7,2) not null default 0.00,
  stats_summary text,
  is_bye boolean not null default false,
  is_eliminated boolean not null default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint unique_user_pool_round_slot unique (pool_id, user_id, round, slot)
);

-- Indexing for rapid leaderboard and lineup aggregation
create index if not exists idx_playoff_lineups_pool_round on public.playoff_lineups(pool_id, round);
create index if not exists idx_playoff_lineups_user on public.playoff_lineups(user_id);

-- 2. Create Playoff Player Scores Cache Table
create table if not exists public.playoff_player_stats (
  id text primary key, -- e.g. "2026_r1_espn_4241479"
  season_year int not null default 2026,
  round int not null check (round between 1 and 4),
  player_id text not null,
  player_name text not null,
  team_id text not null,
  position text not null,
  stats_json jsonb default '{}'::jsonb not null,
  fantasy_points numeric(7,2) not null default 0.00,
  is_final boolean default false not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_playoff_stats_round on public.playoff_player_stats(season_year, round);

-- 3. Row-Level Security (RLS)
alter table public.playoff_lineups enable row level security;
alter table public.playoff_player_stats enable row level security;

-- Playoff Player Stats: Readable by all authenticated users & anon
drop policy if exists "Playoff stats are publicly readable" on public.playoff_player_stats;
create policy "Playoff stats are publicly readable"
  on public.playoff_player_stats for select
  using (true);

-- Playoff Lineups: Selectable by everyone in the pool
drop policy if exists "Playoff lineups viewable by all pool members" on public.playoff_lineups;
create policy "Playoff lineups viewable by all pool members"
  on public.playoff_lineups for select
  using (true);

-- Playoff Lineups: Insertable/Updatable by the user who owns them
drop policy if exists "Users can set their own playoff lineups" on public.playoff_lineups;
create policy "Users can set their own playoff lineups"
  on public.playoff_lineups for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own playoff lineups" on public.playoff_lineups;
create policy "Users can update their own playoff lineups"
  on public.playoff_lineups for update
  using (auth.uid() = user_id);

-- Playoff Lineups: Pool Leader emergency override (doomsday commissioner support)
drop policy if exists "Leaders can manage playoff lineups" on public.playoff_lineups;
create policy "Leaders can manage playoff lineups"
  on public.playoff_lineups for all
  using (
    exists (
      select 1 from public.pools
      where pools.id = playoff_lineups.pool_id
        and (pools.leader_id = auth.uid() or pools.creator_id = auth.uid())
    )
  );
