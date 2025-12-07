-- Migration: Create RPC for AI to create subtasks and lock parent
-- This migration creates a new RPC function `create_ai_subtask_and_lock_parent`
-- that allows an AI assistant to create a sub-task and atomically lock the
-- parent task's delegation in a single transaction.

create or replace function create_ai_subtask_and_lock_parent(
  p_project_id uuid,
  p_parent_id uuid,
  p_title text,
  p_description text
)
returns tasks
language plpgsql
security definer
as $$
declare
  new_task tasks;
  parent_task tasks;
  new_position int;
begin
  -- 1. Lock the parent task for update to prevent race conditions
  select * into parent_task from public.tasks where id = p_parent_id for update;

  -- 2. Check if parent task exists and is delegated
  if parent_task is null then
    raise exception 'Parent task not found';
  end if;

  if not parent_task.is_delegated then
    raise exception 'AI can only create sub-tasks for delegated tasks.';
  end if;

  -- 3. Update the parent task's delegation_locked_at timestamp if it's not already set
  if parent_task.delegation_locked_at is null then
    update public.tasks
    set delegation_locked_at = now()
    where id = p_parent_id;
  end if;

  -- 4. Calculate the position for the new sub-task
  select coalesce(max(position), 0) + 1
  into new_position
  from public.tasks
  where project_id = p_project_id and parent_id = p_parent_id;

  -- 5. Insert the new sub-task
  insert into public.tasks(project_id, parent_id, title, description, status_id, position, created_by_ai)
  values (p_project_id, p_parent_id, p_title, p_description, 1, new_position, true)
  returning * into new_task;

  -- 6. Return the newly created task
  return new_task;
end;
$$;

-- Grant execute permission to the authenticated role
grant execute on function public.create_ai_subtask_and_lock_parent(uuid, uuid, text, text) to authenticated;
