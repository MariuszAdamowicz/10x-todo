-- migration: 20251111100000_create_reject_task_proposal_rpc.sql
-- purpose: Creates an rpc function to reject a task status proposal and add a comment in a single transaction.
-- author: Gemini

/**
 * Rejects a status change proposal for a specific task and records a comment about it.
 * This function is designed to be called by the application service layer.
 * It ensures that updating the task status and creating the associated comment
 * happen atomically.
 *
 * @param p_task_id The UUID of the task to update.
 * @param p_comment_text The text content of the comment explaining the rejection.
 * @returns The updated task record.
 */
create or replace function public.reject_task_proposal(
  p_task_id uuid,
  p_comment_text text
)
returns tasks
language plpgsql
-- security definer is used to run the function with the permissions of the user that created it,
-- which is necessary to bypass rls for the transactional update.
-- the calling service method is responsible for authorization checks.
security definer
set search_path = public
as $$
declare
  updated_task tasks;
  previous_status_id smallint;
begin
  -- get the previous status id before updating
  select status_id into previous_status_id from tasks where id = p_task_id;

  -- update the task status to 'To Do' (id: 1)
  update tasks
  set status_id = 1,
      updated_at = now()
  where id = p_task_id
  returning * into updated_task;

  -- insert the comment with metadata about the status change
  if updated_task is not null then
    insert into task_comments (task_id, comment, author_is_ai, previous_status_id, new_status_id)
    values (
      p_task_id,
      p_comment_text,
      false, -- author is user, not AI
      previous_status_id,
      1
    );
  end if;

  return updated_task;
end;
$$;
