-- Fix: keywords table missing INSERT/UPDATE/DELETE policies
-- This is why keywords saved during onboarding were silently blocked by RLS

create policy "Users insert own keywords" on public.keywords for insert with check (
  exists (select 1 from public.client_sites where id = client_site_id and user_id = auth.uid())
);

create policy "Users update own keywords" on public.keywords for update using (
  exists (select 1 from public.client_sites where id = client_site_id and user_id = auth.uid())
);

create policy "Users delete own keywords" on public.keywords for delete using (
  exists (select 1 from public.client_sites where id = client_site_id and user_id = auth.uid())
);

-- Also fix competitors table — same issue
create policy "Users insert own competitors" on public.competitors for insert with check (
  exists (select 1 from public.client_sites where id = client_site_id and user_id = auth.uid())
);
