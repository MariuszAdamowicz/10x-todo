-- Migration: Add delegation_locked_at to tasks
-- This migration adds a new column to the `tasks` table to track when a delegated
-- task becomes locked for user editing, typically after an AI assistant has
-- started working on it.

-- Add the new column
alter table public.tasks
add column delegation_locked_at timestamptz null;

-- Add a comment to the new column for clarity
comment on column public.tasks.delegation_locked_at is
  'Timestamp indicating when the delegation of this task was locked, preventing the user from revoking it.';
