-- supabase/migrations/20251112100000_create_reorder_tasks_rpc.sql

--
-- Name: reorder_tasks(jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

--
-- Create a function to reorder tasks
--
create or replace function public.reorder_tasks(tasks_to_reorder jsonb)
returns void
language plpgsql
security definer
as $$
declare
    task_item jsonb;
begin
    -- Loop through each task object in the input array
    for task_item in select * from jsonb_array_elements(tasks_to_reorder)
    loop
        -- Update the position of the task identified by its ID
        update public.tasks
        set "position" = (task_item->>'order')::integer
        where id = (task_item->>'id')::uuid;
    end loop;
end;
$$;

--
-- Name: FUNCTION reorder_tasks(tasks_to_reorder jsonb); Type: COMMENT; Schema: public; Owner: postgres
--

comment on function public.reorder_tasks(tasks_to_reorder jsonb) is 'Updates the position of multiple tasks in a single transaction based on a JSONB array of task IDs and their new positions.';

--
-- Grant execute permission on the function to the authenticated role
--
grant execute on function public.reorder_tasks(tasks_to_reorder jsonb) to authenticated;
