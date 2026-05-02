alter table public.user_profiles
add column if not exists projects text[];

update public.user_profiles
set projects = '{}'
where projects is null;

alter table public.user_profiles
alter column projects set default '{}',
alter column projects set not null;
