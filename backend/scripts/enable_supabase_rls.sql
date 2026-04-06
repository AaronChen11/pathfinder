alter table public.usnews_undergrad_rankings enable row level security;
alter table public.user_saved_schools enable row level security;

drop policy if exists "authenticated users can read rankings" on public.usnews_undergrad_rankings;

create policy "authenticated users can read rankings"
on public.usnews_undergrad_rankings
for select
to authenticated
using (true);

drop policy if exists "users can read own saved schools" on public.user_saved_schools;
drop policy if exists "users can insert own saved schools" on public.user_saved_schools;
drop policy if exists "users can update own saved schools" on public.user_saved_schools;
drop policy if exists "users can delete own saved schools" on public.user_saved_schools;

create policy "users can read own saved schools"
on public.user_saved_schools
for select
to authenticated
using (auth.uid() = user_id);

create policy "users can insert own saved schools"
on public.user_saved_schools
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "users can update own saved schools"
on public.user_saved_schools
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "users can delete own saved schools"
on public.user_saved_schools
for delete
to authenticated
using (auth.uid() = user_id);
