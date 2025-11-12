-- migration: create_reorder_tasks_rpc.sql
-- description: creates an rpc function to reorder tasks within a project.
--
-- this function accepts an array of task objects, each with an id and a new order,
-- and updates their 'position' in the database within a single transaction.
-- this ensures atomicity and prevents race conditions.

-- define a composite type to represent a task being reordered.
-- this provides type safety for the array parameter in the rpc function.
create type public.task_reorder_item as (
    id uuid,
    "order" integer
);

--
-- create the rpc function `reorder_tasks`.
--
create or replace function public.reorder_tasks(
    tasks_to_reorder public.task_reorder_item[]
)
returns void
language plpgsql
-- security definer is used to bypass rls for the multi-row update.
-- authorization (i.e., checking if the user owns the project) is handled
-- in the calling service method before this function is invoked.
security definer
set search_path = public
as $$
begin
  -- use a common table expression (cte) to unnest the array of tasks
  -- and prepare the new position values.
  with new_positions as (
    select
      item.id as task_id,
      item.order as new_position
    from unnest(tasks_to_reorder) as item
  )
  -- update the 'position' of all tasks in the tasks table
  -- by joining with the cte on the task id.
  update public.tasks t
  set "position" = np.new_position
  from new_positions np
  where t.id = np.task_id;
end;
$$;

-- grant execute permission on the function to the 'authenticated' role.
-- this allows logged-in users to call this function through the api.
grant execute on function public.reorder_tasks(public.task_reorder_item[]) to authenticated;
