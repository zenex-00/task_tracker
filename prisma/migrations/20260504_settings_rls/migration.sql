alter table public.settings enable row level security;

drop policy if exists "Settings are readable by authenticated users" on public.settings;
create policy "Settings are readable by authenticated users"
on public.settings
for select
to authenticated
using (true);

drop policy if exists "Settings are writable by admins" on public.settings;
create policy "Settings are writable by admins"
on public.settings
for all
to authenticated
using (
  exists (
    select 1
    from public.user_profiles up
    where up.id = auth.uid()
      and up.is_admin = true
  )
)
with check (
  exists (
    select 1
    from public.user_profiles up
    where up.id = auth.uid()
      and up.is_admin = true
  )
);
