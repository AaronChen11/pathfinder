create table if not exists public.student_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  personal_info jsonb not null default '{}'::jsonb,
  academics jsonb not null default '{}'::jsonb,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists student_profiles_set_updated_at on public.student_profiles;

create trigger student_profiles_set_updated_at
before update on public.student_profiles
for each row
execute function public.set_updated_at();

alter table public.student_profiles enable row level security;

drop policy if exists "users can read own student profile" on public.student_profiles;
drop policy if exists "users can insert own student profile" on public.student_profiles;
drop policy if exists "users can update own student profile" on public.student_profiles;
drop policy if exists "users can delete own student profile" on public.student_profiles;

create policy "users can read own student profile"
on public.student_profiles
for select
to authenticated
using (auth.uid() = user_id);

create policy "users can insert own student profile"
on public.student_profiles
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "users can update own student profile"
on public.student_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "users can delete own student profile"
on public.student_profiles
for delete
to authenticated
using (auth.uid() = user_id);
