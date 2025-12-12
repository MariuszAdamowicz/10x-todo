-- migration: 20251212092000_fix_get_tasks_delegated_filter.sql
-- description: updates the get_tasks_with_subtask_counts rpc to fix filtering by is_delegated.
--
-- this change modifies the behavior of the `p_is_delegated` parameter.
-- when `p_is_delegated` is `true`, it filters for delegated tasks.
-- when `p_is_delegated` is `false` or `null`, it does not filter by delegation status.

create or replace function public.get_tasks_with_subtask_counts(
  p_project_id uuid,
  p_user_id uuid,
  p_parent_id uuid default null,
  p_is_delegated boolean default null
)
returns table (
  id uuid,
  project_id uuid,
  parent_id uuid,
  status_id smallint,
  title text,
  description text,
  "position" integer,
  is_delegated boolean,
  created_by_ai boolean,
  created_at timestamptz,
  updated_at timestamptz,
  active_subtask_count bigint,
  completed_subtask_count bigint,
  canceled_subtask_count bigint,
  task_comments jsonb
)
language plpgsql
security definer
as $$
begin
  return query
  with tasks_with_comments as (
    select
      t.id,
      jsonb_agg(
        jsonb_build_object(
          'id', tc.id,
          'comment', tc.comment,
          'author_is_ai', tc.author_is_ai,
          'created_at', tc.created_at,
          'previous_status_id', tc.previous_status_id,
          'new_status_id', tc.new_status_id
        )
      ) filter (where tc.id is not null) as task_comments
    from public.tasks t
    left join public.task_comments tc on t.id = tc.task_id
    group by t.id
  )
  select
      t.id,
      t.project_id,
      t.parent_id,
      t.status_id,
      t.title,
      t.description,
      t."position",
      t.is_delegated,
      t.created_by_ai,
      t.created_at,
      t.updated_at,
      coalesce(counts.active, 0) as active_subtask_count,
      coalesce(counts.completed, 0) as completed_subtask_count,
      coalesce(counts.canceled, 0) as canceled_subtask_count,
      twc.task_comments
  from public.tasks t
  -- join with subtask counts
  left join (
      select
          st.parent_id,
          count(*) filter (where st.status_id = 1) as active,
          count(*) filter (where st.status_id = 2) as completed,
          count(*) filter (where st.status_id = 3) as canceled
      from public.tasks st
      where st.parent_id is not null
      group by st.parent_id
  ) as counts on t.id = counts.parent_id
  -- join with comments
  left join tasks_with_comments twc on t.id = twc.id
  -- ensure user has access
  join public.projects p on t.project_id = p.id and p.user_id = p_user_id
  where
      t.project_id = p_project_id and
      (
        (p_parent_id is null and t.parent_id is null) or
        (t.parent_id = p_parent_id)
      ) and
      (p_is_delegated is not true or t.is_delegated is true);
end;
$$;
