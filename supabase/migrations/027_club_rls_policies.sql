-- ============================================
-- CLUB - Row Level Security Policies
-- ============================================

-- Enable RLS on club tables
alter table public.club_replays enable row level security;
alter table public.club_sessions enable row level security;
alter table public.club_candidates enable row level security;

-- ============================================
-- CLUB_REPLAYS
-- ============================================
-- Anyone can read replays (they are public content for members)
drop policy if exists "Club replays are readable" on public.club_replays;
create policy "Club replays are readable by authenticated users" on public.club_replays
  for select
  to authenticated
  using (true);

-- Only admins can insert/update/delete replays
drop policy if exists "Club replays insert for admins" on public.club_replays;
create policy "Club replays insert for admins" on public.club_replays
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

drop policy if exists "Club replays update for admins" on public.club_replays;
create policy "Club replays update for admins" on public.club_replays
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

drop policy if exists "Club replays delete for admins" on public.club_replays;
create policy "Club replays delete for admins" on public.club_replays
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- ============================================
-- CLUB_SESSIONS
-- ============================================
-- Anyone can read sessions
drop policy if exists "Club sessions are readable" on public.club_sessions;
create policy "Club sessions are readable by authenticated users" on public.club_sessions
  for select
  to authenticated
  using (true);

-- Only admins can insert/update/delete sessions
drop policy if exists "Club sessions insert for admins" on public.club_sessions;
create policy "Club sessions insert for admins" on public.club_sessions
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

drop policy if exists "Club sessions update for admins" on public.club_sessions;
create policy "Club sessions update for admins" on public.club_sessions
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

drop policy if exists "Club sessions delete for admins" on public.club_sessions;
create policy "Club sessions delete for admins" on public.club_sessions
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- ============================================
-- CLUB_CANDIDATES
-- ============================================
-- Users can see their own candidates, admins can see all
drop policy if exists "Club candidates read own" on public.club_candidates;
create policy "Club candidates read own" on public.club_candidates
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Users can insert their own candidates
drop policy if exists "Club candidates insert own" on public.club_candidates;
create policy "Club candidates insert own" on public.club_candidates
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Only admins can update candidates (select/deselect)
drop policy if exists "Club candidates update for admins" on public.club_candidates;
create policy "Club candidates update for admins" on public.club_candidates
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Only admins can delete candidates
drop policy if exists "Club candidates delete for admins" on public.club_candidates;
create policy "Club candidates delete for admins" on public.club_candidates
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );
