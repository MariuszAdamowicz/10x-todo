-- migration: 20251111230000_temp_disable_rls.sql
-- description: temporarily disables row-level security on all tables for debugging purposes.
--
-- warning: this is a temporary measure to unblock development.
-- rls should be re-enabled and configured correctly before any production deployment.

alter table public.profiles disable row level security;
alter table public.projects disable row level security;
alter table public.task_statuses disable row level security;
alter table public.tasks disable row level security;
alter table public.task_comments disable row level security;
