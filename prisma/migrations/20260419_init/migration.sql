-- Prisma initial migration for Supabase
-- Creates core application tables and RLS policies.

create extension if not exists pgcrypto;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  project text,
  hours_spent numeric(10,2),
  priority text,
  status text,
  date_completed date,
  created_date date,
  completion_report jsonb
);

create index if not exists tasks_user_id_idx on public.tasks(user_id);

create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  date date not null,
  hours numeric(10,2),
  task_id uuid references public.tasks(id) on delete set null,
  billable boolean not null default false,
  project text,
  description text
);

create index if not exists time_entries_user_id_idx on public.time_entries(user_id);
create index if not exists time_entries_task_id_idx on public.time_entries(task_id);

create table if not exists public.settings (
  id integer primary key,
  weekly_hour_target integer not null default 40,
  monthly_task_target integer not null default 100,
  projects text[] not null default '{}',
  hour_types jsonb,
  note_fields jsonb,
  upload_fields jsonb
);

insert into public.settings (id)
values (1)
on conflict (id) do nothing;

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  first_name text not null,
  last_name text not null,
  job_role text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_user_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_profiles_updated_at on public.user_profiles;
create trigger trg_user_profiles_updated_at
before update on public.user_profiles
for each row
execute function public.handle_user_profiles_updated_at();

alter table public.tasks enable row level security;
alter table public.time_entries enable row level security;
alter table public.user_profiles enable row level security;

-- user-scoped task read/write
create policy "Users can read their own tasks"
on public.tasks
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own tasks"
on public.tasks
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own tasks"
on public.tasks
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own tasks"
on public.tasks
for delete
to authenticated
using (auth.uid() = user_id);

-- user-scoped time entries read/write
create policy "Users can read their own time entries"
on public.time_entries
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own time entries"
on public.time_entries
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own time entries"
on public.time_entries
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own time entries"
on public.time_entries
for delete
to authenticated
using (auth.uid() = user_id);

-- profile policies
create policy "Users can read their own profile"
on public.user_profiles
for select
to authenticated
using (auth.uid() = id);

create policy "Users can update their own profile"
on public.user_profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);
