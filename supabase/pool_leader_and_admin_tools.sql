-- ==============================================================================
-- NFL WEEKLY POOL - POOL LEADER & ADMINISTRATIVE TOOLS MIGRATION
-- 
-- Run this in your Supabase SQL Editor:
-- Dashboard > SQL Editor > New Query > Paste & Run
-- Direct Link: https://supabase.com/dashboard/project/kweiahuyxdvupsglfhzl/sql/new
-- ==============================================================================

-- 1. POOLS TABLE: Add leader_id column if not exists
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'pools' and column_name = 'leader_id'
  ) then
    alter table public.pools add column leader_id uuid references auth.users(id) on delete set null;
  end if;
end $$;

-- Backfill leader_id from creator_id if currently null
update public.pools 
set leader_id = creator_id 
where leader_id is null and creator_id is not null;


-- 2. POOL MEMBERS TABLE: Add is_hidden column & update role constraint
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'pool_members' and column_name = 'is_hidden'
  ) then
    alter table public.pool_members add column is_hidden boolean default false not null;
  end if;
end $$;

-- Ensure default featured pool has a valid leader if any users exist
do $$
declare
  v_first_user_id uuid;
begin
  select id into v_first_user_id from auth.users order by created_at asc limit 1;
  if v_first_user_id is not null then
    update public.pools
    set leader_id = coalesce(leader_id, v_first_user_id),
        creator_id = coalesce(creator_id, v_first_user_id)
    where id = '00000000-0000-0000-0000-000000000001' and leader_id is null;

    -- Make that user the leader of the featured pool
    insert into public.pool_members (pool_id, user_id, role, is_hidden)
    values ('00000000-0000-0000-0000-000000000001', v_first_user_id, 'leader', false)
    on conflict (pool_id, user_id) 
    do update set role = 'leader';
  end if;
end $$;


-- 3. HELPER FUNCTION: Check if a user is a Pool Leader or Administrator
create or replace function public.is_pool_leader(p_pool_id uuid, p_user_id uuid)
returns boolean as $$
declare
  v_is_leader boolean;
begin
  if p_user_id is null or p_pool_id is null then
    return false;
  end if;

  -- 1. Check if user is the designated pool leader or creator in pools table
  select exists (
    select 1 from public.pools
    where id = p_pool_id and (leader_id = p_user_id or creator_id = p_user_id)
  ) into v_is_leader;

  if v_is_leader then
    return true;
  end if;

  -- 2. Check if user has leader or admin role in pool_members
  select exists (
    select 1 from public.pool_members
    where pool_id = p_pool_id 
      and user_id = p_user_id 
      and role in ('leader', 'admin')
  ) into v_is_leader;

  return coalesce(v_is_leader, false);
end;
$$ language plpgsql security definer;


-- 4. HARDEN & UPDATE POOL MEMBERS RLS POLICIES
alter table public.pool_members enable row level security;

drop policy if exists "Leaders can update pool members" on public.pool_members;
drop policy if exists "Leaders can delete pool members" on public.pool_members;
drop policy if exists "Users can leave pools" on public.pool_members;

-- Leaders can update member settings (e.g. toggle is_hidden, change role)
create policy "Leaders can update pool members"
  on public.pool_members for update
  using (public.is_pool_leader(pool_id, auth.uid()))
  with check (public.is_pool_leader(pool_id, auth.uid()));

-- Leaders can remove members, or users can voluntarily leave
create policy "Leaders can remove members or users can leave"
  on public.pool_members for delete
  using (
    auth.uid() = user_id 
    or public.is_pool_leader(pool_id, auth.uid())
  );


-- 5. DOOMSDAY SCENARIO: ALLOW POOL LEADERS TO EDIT PICKS ON BEHALF OF USERS
-- (Bypasses kickoff deadline lock when executed by a pool leader)
drop policy if exists "Leaders can view all picks in pool" on public.picks;
drop policy if exists "Leaders can insert picks in pool" on public.picks;
drop policy if exists "Leaders can update picks in pool" on public.picks;
drop policy if exists "Leaders can delete picks in pool" on public.picks;

-- Leader Select: Can see all picks in their pool for management/audit
create policy "Leaders can view all picks in pool"
  on public.picks for select
  using (public.is_pool_leader(pool_id, auth.uid()));

-- Leader Insert: Emergency / Doomsday pick entry
create policy "Leaders can insert picks in pool"
  on public.picks for insert
  with check (public.is_pool_leader(pool_id, auth.uid()));

-- Leader Update: Emergency / Doomsday pick corrections
create policy "Leaders can update picks in pool"
  on public.picks for update
  using (public.is_pool_leader(pool_id, auth.uid()))
  with check (public.is_pool_leader(pool_id, auth.uid()));

-- Leader Delete: Emergency pick removal
create policy "Leaders can delete picks in pool"
  on public.picks for delete
  using (public.is_pool_leader(pool_id, auth.uid()));


-- 6. DOOMSDAY SCENARIO: ALLOW POOL LEADERS TO OVERRIDE TIEBREAKERS
drop policy if exists "Leaders can manage tiebreakers in pool" on public.tiebreakers;

create policy "Leaders can manage tiebreakers in pool"
  on public.tiebreakers for all
  using (public.is_pool_leader(pool_id, auth.uid()))
  with check (public.is_pool_leader(pool_id, auth.uid()));


-- 7. POOL SETTINGS MANAGEMENT: Allow leaders to update pool properties
drop policy if exists "Leaders can update pool settings" on public.pools;

create policy "Leaders can update pool settings"
  on public.pools for update
  using (public.is_pool_leader(id, auth.uid()))
  with check (public.is_pool_leader(id, auth.uid()));


-- 8. AUTOMATIC LEADER PROMOTION UPON POOL CREATION TRIGGER
create or replace function public.handle_new_pool_leader()
returns trigger as $$
begin
  -- If pool has a creator_id and no leader_id, set leader_id
  if new.leader_id is null and new.creator_id is not null then
    new.leader_id := new.creator_id;
  end if;

  -- Ensure creator/leader is enrolled as a leader in pool_members
  if new.leader_id is not null then
    insert into public.pool_members (pool_id, user_id, role, is_hidden)
    values (new.id, new.leader_id, 'leader', false)
    on conflict (pool_id, user_id) 
    do update set role = 'leader';
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_pool_created_assign_leader on public.pools;
create trigger on_pool_created_assign_leader
  after insert on public.pools
  for each row execute procedure public.handle_new_pool_leader();
