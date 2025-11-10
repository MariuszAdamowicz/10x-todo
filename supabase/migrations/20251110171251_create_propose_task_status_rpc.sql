-- migration: 20251110171251_create_propose_task_status_rpc.sql
-- purpose: Creates an rpc function to propose a task status change and add a comment in a single transaction.
-- author: Gemini

/**
 * Proposes a status change for a specific task and records a comment about it.
 * This function is designed to be called by the application service layer.
 * It ensures that updating the task status and creating the associated comment
 * happen atomically.
 *
 * @param p_task_id The UUID of the task to update.
 * @param p_new_status_id The smallint ID of the new (pending) status for the task.
 * @param p_comment_text The text content of the comment explaining the proposal.
 * @param p_author_is_ai A boolean flag indicating if the author of the comment is the AI.
 * @returns The updated task record.
 */
create or replace function propose_task_status(
  p_task_id uuid,
  p_new_status_id smallint,
  p_comment_text text,
  p_author_is_ai boolean
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

  -- update the task status to the new pending status
  update tasks
  set status_id = p_new_status_id,
      updated_at = now()
  where id = p_task_id
  returning * into updated_task;

  -- insert the comment with metadata about the status change
  if updated_task is not null then
    insert into task_comments (task_id, comment, author_is_ai, metadata)
    values (
      p_task_id,
      p_comment_text,
      p_author_is_ai,
      jsonb_build_object(
        'action', 'propose_status',
        'previous_status_id', previous_status_id,
        'new_status_id', p_new_status_id
      )
    );
  end if;

  return updated_task;
end;
$$;
