-- Harden database integrity for task/time-entry ownership and settings persistence.

-- Remove rows that can never be accessed correctly under user-scoped RLS.
delete from public.time_entries te
where te.user_id is null
   or not exists (select 1 from auth.users au where au.id = te.user_id);

delete from public.tasks t
where t.user_id is null
   or not exists (select 1 from auth.users au where au.id = t.user_id);

-- Remove orphaned task links before tightening task foreign key behavior.
delete from public.time_entries te
where te.task_id is not null
  and not exists (select 1 from public.tasks t where t.id = te.task_id);

-- Backfill nullable fields with application defaults.
update public.tasks
set project = 'General'
where project is null or btrim(project) = '';

update public.tasks
set hours_spent = 0
where hours_spent is null;

update public.tasks
set priority = 'Medium'
where priority is null or btrim(priority) = '';

update public.tasks
set status = 'Not Started'
where status is null or btrim(status) = '';

update public.tasks
set created_date = current_date
where created_date is null;

update public.time_entries
set hours = 0
where hours is null;

update public.time_entries
set project = 'General'
where project is null or btrim(project) = '';

update public.time_entries
set description = ''
where description is null;

update public.settings
set hour_types = coalesce(hour_types, '[]'::jsonb),
    note_fields = coalesce(note_fields, '[]'::jsonb),
    upload_fields = coalesce(upload_fields, '[]'::jsonb)
where hour_types is null
   or note_fields is null
   or upload_fields is null;

-- Tighten column defaults and nullability.
alter table public.tasks
  alter column user_id set not null,
  alter column project set default 'General',
  alter column project set not null,
  alter column hours_spent set default 0,
  alter column hours_spent set not null,
  alter column priority set default 'Medium',
  alter column priority set not null,
  alter column status set default 'Not Started',
  alter column status set not null,
  alter column created_date set default current_date,
  alter column created_date set not null;

alter table public.time_entries
  alter column user_id set not null,
  alter column hours set default 0,
  alter column hours set not null,
  alter column project set default 'General',
  alter column project set not null,
  alter column description set default '',
  alter column description set not null;

alter table public.settings
  alter column hour_types set default '[]'::jsonb,
  alter column hour_types set not null,
  alter column note_fields set default '[]'::jsonb,
  alter column note_fields set not null,
  alter column upload_fields set default '[]'::jsonb,
  alter column upload_fields set not null;

-- Enforce known status/priority domain at the database level.
alter table public.tasks drop constraint if exists tasks_status_check;
alter table public.tasks add constraint tasks_status_check check (status in ('Not Started', 'In Progress', 'Completed'));

alter table public.tasks drop constraint if exists tasks_priority_check;
alter table public.tasks add constraint tasks_priority_check check (priority in ('Low', 'Medium', 'High'));

-- Use cascades where the app expects dependent cleanup.
alter table public.tasks drop constraint if exists tasks_user_id_fkey;
alter table public.time_entries drop constraint if exists time_entries_user_id_fkey;
alter table public.time_entries drop constraint if exists time_entries_task_id_fkey;

alter table public.tasks
  add constraint tasks_user_id_fkey
  foreign key (user_id)
  references auth.users(id)
  on delete cascade;

alter table public.time_entries
  add constraint time_entries_user_id_fkey
  foreign key (user_id)
  references auth.users(id)
  on delete cascade;

alter table public.time_entries
  add constraint time_entries_task_id_fkey
  foreign key (task_id)
  references public.tasks(id)
  on delete cascade;
