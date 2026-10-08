-- NFL Weekly Picks Pool Database Schema (Supabase / PostgreSQL)

-- 1. Profiles Table (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null,
  avatar_url text,
  is_admin boolean default false,
  created_at timestamptz default now() not null
);

-- 2. Weeks Table
create table if not exists public.weeks (
  week_number int primary key,
  season_year int not null default 2026,
  title text not null,
  start_date timestamptz not null,
  end_date timestamptz not null,
  lock_date timestamptz not null,
  is_current boolean default false,
  is_completed boolean default false
);

-- 3. Games Table
create table if not exists public.games (
  id text primary key,
  week_number int references public.weeks(week_number) on delete cascade not null,
  season_year int not null default 2026,
  home_team text not null,
  away_team text not null,
  kickoff_time timestamptz not null,
  status text not null default 'SCHEDULED', -- 'SCHEDULED', 'IN_PROGRESS', 'FINAL'
  spread numeric,
  home_score int,
  away_score int,
  winner_team text,
  tv_network text,
  is_monday_night boolean default false
);

-- 4. User Picks Table
create table if not exists public.picks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  game_id text references public.games(id) on delete cascade not null,
  selected_team text not null,
  is_correct boolean,
  points_awarded int default 0,
  updated_at timestamptz default now() not null,
  constraint unique_user_game_pick unique (user_id, game_id)
);

-- 5. Tiebreakers Table (e.g. Total combined points in Monday Night Football game)
create table if not exists public.tiebreakers (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  week_number int references public.weeks(week_number) on delete cascade not null,
  predicted_mnf_score int not null,
  updated_at timestamptz default now() not null,
  constraint unique_user_week_tiebreaker unique (user_id, week_number)
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.weeks enable row level security;
alter table public.games enable row level security;
alter table public.picks enable row level security;
alter table public.tiebreakers enable row level security;

-- Profiles Policies
create policy "Public profiles are viewable by everyone."
  on public.profiles for select
  using (true);

create policy "Users can update their own profile."
  on public.profiles for update
  using (auth.uid() = id);

-- Weeks Policies
create policy "Weeks are viewable by all authenticated users."
  on public.weeks for select
  using (true);

-- Games Policies
create policy "Games are viewable by everyone."
  on public.games for select
  using (true);

-- Picks Policies
-- Users can always view their own picks
create policy "Users can view their own picks."
  on public.picks for select
  using (auth.uid() = user_id);

-- After kickoff, all users can view everyone's picks (transparency)
create policy "Users can view others picks after kickoff."
  on public.picks for select
  using (
    exists (
      select 1 from public.games
      where games.id = picks.game_id
      and games.kickoff_time <= now()
    )
  );

-- Users can insert/update their picks ONLY before game kickoff
create policy "Users can manage picks before kickoff."
  on public.picks for insert
  with check (
    auth.uid() = user_id and
    exists (
      select 1 from public.games
      where games.id = picks.game_id
      and games.kickoff_time > now()
    )
  );

create policy "Users can update picks before kickoff."
  on public.picks for update
  using (
    auth.uid() = user_id and
    exists (
      select 1 from public.games
      where games.id = picks.game_id
      and games.kickoff_time > now()
    )
  );

-- Tiebreaker Policies
create policy "Users can manage their own tiebreakers."
  on public.tiebreakers for all
  using (auth.uid() = user_id);

-- Automatic Profile Creation Trigger on Sign Up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
