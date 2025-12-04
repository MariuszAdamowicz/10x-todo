-- migration: 20251204201843_reenable_rls_and_policies.sql
-- description: explicitly re-enables row-level security (rls) on the projects table and recreates the necessary policies.
--
-- this migration ensures that rls is active for the projects table and that
-- users can only access their own data, which is a critical security measure
-- and likely the fix for hanging queries if rls was misconfigured.

-- step 1: ensure rls is enabled on the projects table.
-- if it's already enabled, this command does nothing.
alter table public.projects enable row level security;

-- step 2: drop existing policies on the projects table to start fresh.
-- this prevents conflicts if policies with the same name already exist.
drop policy if exists "allow select for users on their own projects" on public.projects;
drop policy if exists "allow insert for users on their own projects" on public.projects;
drop policy if exists "allow update for users on their own projects" on public.projects;
drop policy if exists "allow delete for users on their own projects" on public.projects;

-- step 3: recreate the rls policies for the projects table.
-- these policies ensure that a user can only interact with their own projects.

-- policy: allow select
-- users can only see projects where their user_id matches the project's user_id.
create policy "allow select for users on their own projects"
on public.projects for select
using (auth.uid() = user_id);

-- policy: allow insert
-- users can only create new projects for themselves.
create policy "allow insert for users on their own projects"
on public.projects for insert
with check (auth.uid() = user_id);

-- policy: allow update
-- users can only update projects they own.
create policy "allow update for users on their own projects"
on public.projects for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- policy: allow delete
-- users can only delete projects they own.
create policy "allow delete for users on their own projects"
on public.projects for delete
using (auth.uid() = user_id);
