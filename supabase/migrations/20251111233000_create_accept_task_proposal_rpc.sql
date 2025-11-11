-- migration: 20251111233000_create_accept_task_proposal_rpc.sql
-- description: creates an rpc function to accept a task status proposal.
--
-- this function encapsulates the logic for a user to accept a proposed status
-- change from an ai. it verifies ownership, checks the current task status,
-- and updates it atomically.

create or replace function public.accept_task_proposal(p_task_id uuid, p_user_id uuid)
returns tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_user_id uuid;
  v_current_status_id int;
  v_new_status_id int;
  v_updated_task tasks;
begin
  -- select the current status of the task and the user_id of the project owner.
  -- this ensures the task exists and we can check for ownership.
  select
    t.status_id,
    p.user_id
  into
    v_current_status_id,
    v_project_user_id
  from public.tasks t
  join public.projects p on t.project_id = p.id
  where t.id = p_task_id;

  -- if no task was found, raise an exception.
  if not found then
    raise exception 'task not found' using errcode = 'pgrst';
  end if;

  -- check if the user accepting the proposal is the owner of the project.
  if v_project_user_id != p_user_id then
    raise exception 'user is not the owner of the project' using errcode = '42501';
  end if;

  -- check if the task is in a state that allows proposal acceptance.
  -- status 4: 'done, pending acceptance'
  -- status 5: 'canceled, pending confirmation'
  if v_current_status_id not in (4, 5) then
    raise exception 'task is not pending acceptance' using errcode = '23514';
  end if;

  -- determine the new status based on the current pending status.
  -- from 'done, pending acceptance' (4) to 'done' (2)
  -- from 'canceled, pending confirmation' (5) to 'canceled' (3)
  v_new_status_id := case v_current_status_id
    when 4 then 2
    when 5 then 3
  end;

  -- update the task with the new status.
  update public.tasks
  set
    status_id = v_new_status_id,
    updated_at = now()
  where id = p_task_id
  returning * into v_updated_task;

  -- return the updated task record.
  return v_updated_task;
end;
$$;

grant execute on function public.accept_task_proposal(uuid, uuid) to authenticated;
