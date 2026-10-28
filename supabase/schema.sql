-- Private, per-browser profiles. Anonymous Supabase Auth assigns each browser
-- its own auth.uid(); row-level security prevents other visitors reading or
-- changing those rows. Enable Anonymous Sign-Ins in Supabase Auth settings.
create table if not exists public.people (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  profile jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.people enable row level security;

drop policy if exists "People can read their own profiles" on public.people;
create policy "People can read their own profiles"
  on public.people for select to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "People can add their own profiles" on public.people;
create policy "People can add their own profiles"
  on public.people for insert to authenticated
  with check ((select auth.uid()) = owner_id);

drop policy if exists "People can update their own profiles" on public.people;
create policy "People can update their own profiles"
  on public.people for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "People can delete their own profiles" on public.people;
create policy "People can delete their own profiles"
  on public.people for delete to authenticated
  using ((select auth.uid()) = owner_id);

create table if not exists public.date_results (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  person_a_id uuid not null references public.people(id) on delete cascade,
  person_b_id uuid not null references public.people(id) on delete cascade,
  result jsonb not null,
  created_at timestamptz not null default now(),
  unique(owner_id, person_a_id, person_b_id)
);

grant select, insert, update, delete on public.people to authenticated;
grant select, insert, update, delete on public.date_results to authenticated;

alter table public.date_results enable row level security;

drop policy if exists "People can read their own date results" on public.date_results;
create policy "People can read their own date results"
  on public.date_results for select to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "People can add their own date results" on public.date_results;
create policy "People can add their own date results"
  on public.date_results for insert to authenticated
  with check ((select auth.uid()) = owner_id);

drop policy if exists "People can update their own date results" on public.date_results;
create policy "People can update their own date results"
  on public.date_results for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "People can delete their own date results" on public.date_results;
create policy "People can delete their own date results"
  on public.date_results for delete to authenticated
  using ((select auth.uid()) = owner_id);
