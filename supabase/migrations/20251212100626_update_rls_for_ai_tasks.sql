-- supabase/migrations/20251212100626_update_rls_for_ai_tasks.sql
--
-- This migration updates the Row Level Security (RLS) policies for the 'tasks' table
-- to prevent users from updating or deleting tasks that were created by the AI.
--
-- Affected tables/policies:
-- - public.tasks: "allow update for users on their own tasks"
-- - public.tasks: "allow delete for users on their own tasks"
--
-- The updated policies add a check for `created_by_ai = false` to ensure that only
-- user-created tasks can be modified or deleted by users.

-- 1. Drop the existing 'allow update' policy for authenticated users.
-- This policy is too permissive as it allows modification of AI-created tasks.
drop policy "allow update for users on their own tasks" on public.tasks;

-- 2. Create a new 'allow update' policy for authenticated users.
-- This new policy restricts updates to tasks that were NOT created by the AI (`created_by_ai = false`).
-- Users can only update tasks which are part of projects they have access to.
create policy "allow update for users on their own tasks" on public.tasks
for update to authenticated using (
    created_by_ai = false and exists (select 1 from public.projects where projects.id = tasks.project_id and projects.user_id = auth.uid())
) with check (
    created_by_ai = false and exists (select 1 from public.projects where projects.id = tasks.project_id and projects.user_id = auth.uid())
);

-- 3. Drop the existing 'allow delete' policy for authenticated users.
-- This policy is too permissive as it allows deletion of AI-created tasks.
drop policy "allow delete for users on their own tasks" on public.tasks;

-- 4. Create a new 'allow delete' policy for authenticated users.
-- This new policy restricts deletions to tasks that were NOT created by the AI (`created_by_ai = false`).
-- Users can only delete tasks they have created.
create policy "allow delete for users on their own tasks" on public.tasks
for delete to authenticated using (
    created_by_ai = false and exists (select 1 from public.projects where projects.id = tasks.project_id and projects.user_id = auth.uid())
);
