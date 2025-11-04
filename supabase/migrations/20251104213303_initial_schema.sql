-- migration: 20251104213303_initial_schema.sql
-- description: initial database schema for the 10x to-do app.
--
-- this migration sets up the core tables, relationships, indexes,
-- and row level security policies required for the application.
-- it includes tables for profiles, projects, tasks (with hierarchy),
-- task statuses, and comments. it also establishes security policies
-- for both authenticated users and ai assistants (via api key).

--
-- table: public.profiles
-- description: stores public user data, linked to supabase's auth.users.
--
create table public.profiles (
    id uuid not null primary key references auth.users(id) on delete cascade,
    created_at timestamptz not null default now()
);
comment on table public.profiles is 'stores public user data, linked to supabases auth.users.';

--
-- table: public.projects
-- description: contains user projects, each with a unique api key for ai interaction.
--
create table public.projects (
    id uuid not null primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    description text null,
    api_key uuid not null unique default gen_random_uuid(),
    created_at timestamptz not null default now()
);
comment on table public.projects is 'contains user projects, each with a unique api key for ai interaction.';

--
-- table: public.task_statuses
-- description: dictionary table for task statuses.
--
create table public.task_statuses (
    id smallint not null primary key,
    name text not null unique
);
comment on table public.task_statuses is 'dictionary table for task statuses.';

--
-- table: public.tasks
-- description: core table for tasks, supporting hierarchical structure.
--
create table public.tasks (
    id uuid not null primary key default gen_random_uuid(),
    project_id uuid not null references public.projects(id) on delete cascade,
    parent_id uuid null references public.tasks(id) on delete cascade,
    status_id smallint not null references public.task_statuses(id),
    title text not null,
    description text null,
    "position" integer not null default 0,
    is_delegated boolean not null default false,
    created_by_ai boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
comment on table public.tasks is 'core table for tasks, supporting hierarchical structure.';

--
-- table: public.task_comments
-- description: stores comments and history of status changes for tasks.
--
create table public.task_comments (
    id uuid not null primary key default gen_random_uuid(),
    task_id uuid not null references public.tasks(id) on delete cascade,
    comment text not null,
    author_is_ai boolean not null default false,
    previous_status_id smallint null references public.task_statuses(id),
    new_status_id smallint null references public.task_statuses(id),
    created_at timestamptz not null default now()
);
comment on table public.task_comments is 'stores comments and history of status changes for tasks.';

--
-- enable row level security (rls) for all tables.
--
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.task_statuses enable row level security;
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;

--
-- insert initial data for task statuses.
--
insert into public.task_statuses (id, name) values
(1, 'To Do'),
(2, 'Done'),
(3, 'Canceled'),
(4, 'Done, pending acceptance'),
(5, 'Canceled, pending confirmation');

--
-- create indexes for performance optimization.
--
create index on public.projects (user_id);
create index on public.tasks (project_id);
create index on public.tasks (parent_id);
create index on public.tasks (status_id);
create index on public.task_comments (task_id);

--
-- create a trigger function to automatically update the updated_at timestamp.
--
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

--
-- apply the trigger to the tasks table.
--
create trigger on_tasks_update
before update on public.tasks
for each row
execute procedure public.handle_updated_at();

--
-- rls helper functions
--
-- gets project_id from an api key.
create or replace function public.get_project_id_from_api_key(api_key_value uuid)
returns uuid
language sql
security invoker
as $$
  select id from public.projects where api_key = api_key_value;
$$;

-- checks if an ai can create a subtask for a given parent task.
create or replace function public.can_ai_create_subtask(task_id_to_check uuid, project_id_from_key uuid)
returns boolean
language sql
security invoker
as $$
  select exists (
    select 1
    from public.tasks
    where id = task_id_to_check
      and project_id = project_id_from_key
      and is_delegated = true
  );
$$;

--
-- rls policies
--

-- profiles policies
create policy "allow select for all users" on public.profiles for select using (true);
create policy "allow insert for users on their own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "allow update for users on their own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "allow delete for users on their own profile" on public.profiles for delete using (auth.uid() = id);

-- projects policies
create policy "allow select for users on their own projects" on public.projects for select using (auth.uid() = user_id);
create policy "allow insert for users on their own projects" on public.projects for insert with check (auth.uid() = user_id);
create policy "allow update for users on their own projects" on public.projects for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "allow delete for users on their own projects" on public.projects for delete using (auth.uid() = user_id);

-- task_statuses policies
create policy "allow select for all users" on public.task_statuses for select using (true);

-- tasks policies (authenticated user)
create policy "allow select for users on their own tasks" on public.tasks for select using (exists (select 1 from public.projects where projects.id = tasks.project_id and projects.user_id = auth.uid()));
create policy "allow insert for users on their own tasks" on public.tasks for insert with check (exists (select 1 from public.projects where projects.id = tasks.project_id and projects.user_id = auth.uid()));
create policy "allow update for users on their own tasks" on public.tasks for update using (exists (select 1 from public.projects where projects.id = tasks.project_id and projects.user_id = auth.uid())) with check (exists (select 1 from public.projects where projects.id = tasks.project_id and projects.user_id = auth.uid()));
create policy "allow delete for users on their own tasks" on public.tasks for delete using (exists (select 1 from public.projects where projects.id = tasks.project_id and projects.user_id = auth.uid()));

-- tasks policies (anon - ai assistant)
create policy "allow select for ai on project tasks" on public.tasks for select to anon using (project_id = public.get_project_id_from_api_key((current_setting('request.headers', true)::json->>'x-api-key')::uuid));
create policy "allow insert for ai on delegated tasks" on public.tasks for insert to anon with check (
    created_by_ai = true and
    project_id = public.get_project_id_from_api_key((current_setting('request.headers', true)::json->>'x-api-key')::uuid) and
    public.can_ai_create_subtask(parent_id, project_id)
);
create policy "allow update for ai on its own or delegated tasks" on public.tasks for update to anon using (project_id = public.get_project_id_from_api_key((current_setting('request.headers', true)::json->>'x-api-key')::uuid)) with check (
    project_id = public.get_project_id_from_api_key((current_setting('request.headers', true)::json->>'x-api-key')::uuid) and
    (
        -- case 1: ai updates a task it created
        (created_by_ai = true) or
        -- case 2: ai proposes a status change on a delegated task
        (is_delegated = true and status_id in (4, 5))
    )
);

-- task_comments policies (authenticated user)
create policy "allow select for users on their own comments" on public.task_comments for select using (exists (select 1 from public.tasks where tasks.id = task_comments.task_id));
create policy "allow insert for users on their own comments" on public.task_comments for insert with check (author_is_ai = false and exists (select 1 from public.tasks where tasks.id = task_comments.task_id));

-- task_comments policies (anon - ai assistant)
create policy "allow select for ai on project comments" on public.task_comments for select to anon using (exists (select 1 from public.tasks where tasks.id = task_comments.task_id and tasks.project_id = public.get_project_id_from_api_key((current_setting('request.headers', true)::json->>'x-api-key')::uuid)));
create policy "allow insert for ai on project comments" on public.task_comments for insert to anon with check (
    author_is_ai = true and
    exists (select 1 from public.tasks where tasks.id = task_comments.task_id and tasks.project_id = public.get_project_id_from_api_key((current_setting('request.headers', true)::json->>'x-api-key')::uuid))
);
