import type { SupabaseClient } from "@/db/supabase.client";
import type {
  ReorderTasksDto,
  Task,
  TaskCreateCommand,
  TaskProposeStatusCommand,
  TaskUpdateCommand,
  TaskWithComments,
} from "@/types";
import { AuthorizationError, InvalidStateError, ProjectNotFoundError, TaskNotFoundError } from "../errors";

const MOCK_TASKS: TaskWithComments[] = [
  {
    id: "task-1",
    project_id: "1",
    parent_id: null,
    title: "Mock Task 1 for Project 1",
    description: "This is the first mock task.",
    status_id: 1, // To Do
    position: 1,
    is_delegated: false,
    created_by_ai: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    task_comments: [],
  },
  {
    id: "task-2",
    project_id: "1",
    parent_id: null,
    title: "Mock Task 2 for Project 1",
    description: "This is the second mock task.",
    status_id: 2, // In Progress
    position: 2,
    is_delegated: true,
    created_by_ai: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    task_comments: [],
  },
  {
    id: "task-3",
    project_id: "1",
    parent_id: "task-2",
    title: "Sub-task for Mock Task 2",
    description: "This is a sub-task.",
    status_id: 1, // To Do
    position: 1,
    is_delegated: false,
    created_by_ai: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    task_comments: [],
  },
];

const USE_MOCK_SERVICES = import.meta.env.PUBLIC_MOCK_SERVICES === "true";

export interface GetTasksFilters {
  projectId?: string;
  parentId?: string | null;
  statusId?: number;
  delegated?: boolean;
}

export interface GetTasksPagination {
  page: number;
  limit: number;
}

export interface GetTasksOptions {
  filters: GetTasksFilters;
  pagination: GetTasksPagination;
  auth: {
    userId?: string;
    aiProjectId?: string;
  };
}

export class TaskService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  public async getTasks(options: GetTasksOptions): Promise<{ data: TaskWithComments[]; count: number }> {
    if (USE_MOCK_SERVICES) {
      console.log("Using mock TaskService.getTasks");
      const { filters } = options;
      return new Promise((resolve) => {
        setTimeout(() => {
          const filteredTasks = MOCK_TASKS.filter((task) => {
            let match = true;
            if (filters.projectId && task.project_id !== filters.projectId) {
              match = false;
            }
            if (filters.parentId !== undefined) {
              if (filters.parentId === null && task.parent_id !== null) {
                match = false;
              } else if (filters.parentId !== null && task.parent_id !== filters.parentId) {
                match = false;
              }
            }
            return match;
          });
          // This mock needs to be updated to include sub-task counts
          const dataWithCounts = filteredTasks.map(t => ({...t, active_subtask_count: 0, completed_subtask_count: 0, canceled_subtask_count: 0, task_comments: []}))
          resolve({ data: dataWithCounts, count: filteredTasks.length });
        }, 500);
      });
    }

    const { filters, auth } = options;
    const { userId } = auth;
    const { projectId, parentId } = filters;

    if (!userId || !projectId) {
      throw new AuthorizationError("User and Project ID are required.");
    }
    
    const { data, error } = await this.supabase.rpc('get_tasks_with_subtask_counts', {
      p_project_id: projectId,
      p_user_id: userId,
      p_parent_id: parentId,
    })

    if (error) {
      console.error("Error fetching tasks with counts:", error);
      throw new Error("Failed to fetch tasks.");
    }

    // The RPC returns comments as a JSONB object. We need to handle the case where it's null.
    const tasks = data.map(t => ({
      ...t,
      task_comments: t.task_comments ?? []
    }));

    return { data: tasks || [], count: tasks.length || 0 };
  }

  public async createTask(command: TaskCreateCommand, auth: { userId?: string; projectId?: string }): Promise<Task> {
    // 1. Determine Project ID and check for auth
    const projectId = auth.userId ? command.project_id : auth.projectId;
    const createdByAi = !!auth.projectId;

    if (!projectId) {
      throw new Error("Project ID is required to create a task.");
    }

    // 2. Verify project exists and user has access
    const { data: project, error: projectError } = await this.supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      throw new ProjectNotFoundError("Project not found or user does not have access.");
    }

    // 3. Validate parent_id if provided
    if (command.parent_id) {
      const { data: parentTask, error: parentError } = await this.supabase
        .from("tasks")
        .select("id, project_id, is_delegated")
        .eq("id", command.parent_id)
        .single();

      if (parentError || !parentTask) {
        throw new TaskNotFoundError("Parent task not found.");
      }

      if (parentTask.project_id !== projectId) {
        throw new AuthorizationError("Parent task does not belong to the specified project.");
      }

      // AI-specific rules
      if (createdByAi && !parentTask.is_delegated) {
        throw new AuthorizationError("AI can only create sub-tasks for delegated tasks.");
      }
    }

    // 4. Calculate new position
    const positionQuery = this.supabase.from("tasks").select("position").eq("project_id", projectId);

    if (command.parent_id) {
      positionQuery.eq("parent_id", command.parent_id);
    } else {
      positionQuery.is("parent_id", null);
    }

    const { data: lastTask, error: positionError } = await positionQuery
      .order("position", { ascending: false })
      .limit(1)
      .single();

    if (positionError && positionError.code !== "PGRST116") {
      // PGRST116: 'exact-single' - no rows found, which is fine.
      throw new Error("Could not determine task position.");
    }

    const newPosition = (lastTask?.position ?? 0) + 1;

    // 5. Insert new task
    const newTaskData = {
      ...command,
      project_id: projectId,
      position: newPosition,
      created_by_ai: createdByAi,
      status_id: 1, // Default to 'To Do'
    };

    const { data: newTask, error: insertError } = await this.supabase
      .from("tasks")
      .insert(newTaskData)
      .select()
      .single();

    if (insertError || !newTask) {
      console.error("Supabase insert error:", insertError);
      throw new Error("Failed to create task.");
    }

    return newTask;
  }
  public async getTaskById({ taskId }: { taskId: string }): Promise<Task> {
    const { data, error } = await this.supabase.from("tasks").select("*").eq("id", taskId).single();

    if (error || !data) {
      if (error && error.code !== "PGRST116") {
        console.error("Error fetching task:", error);
      }
      throw new TaskNotFoundError();
    }

    return data;
  }

  public async updateTask(
    taskId: string,
    data: TaskUpdateCommand,
    auth: { userId?: string; aiProjectId?: string }
  ): Promise<Task> {
    if (!auth.userId && !auth.aiProjectId) {
      throw new AuthorizationError("Authentication required.");
    }

    // Base query
    const query = this.supabase.from("tasks").update(data).eq("id", taskId);

    // Authorization check
    if (auth.userId) {
      const { data: projectData, error: projectError } = await this.supabase
        .from("tasks")
        .select("projects(user_id)")
        .eq("id", taskId)
        .single();

      if (projectError || !projectData) {
        throw new TaskNotFoundError();
      }

      if (projectData.projects?.user_id !== auth.userId) {
        throw new AuthorizationError();
      }
    } else if (auth.aiProjectId) {
      query.eq("project_id", auth.aiProjectId);

      if (data.is_delegated !== undefined) {
        throw new AuthorizationError("AI is not allowed to change the delegation status.");
      }
      if (data.status_id !== undefined) {
        throw new AuthorizationError("AI is not allowed to change the task status directly.");
      }
    }

    const { data: updatedTask, error } = await query.select().single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new TaskNotFoundError();
      }
      console.error("Error updating task:", error);
      throw new Error("Failed to update task.");
    }

    return updatedTask;
  }

  public async proposeTaskStatus(
    taskId: string,
    command: TaskProposeStatusCommand,
    auth: { aiProjectId: string }
  ): Promise<Task> {
    // 1. Fetch the task to verify ownership and delegation status
    const { data: task, error: fetchError } = await this.supabase
      .from("tasks")
      .select("id, project_id, is_delegated")
      .eq("id", taskId)
      .eq("project_id", auth.aiProjectId)
      .single();

    if (fetchError || !task) {
      throw new TaskNotFoundError("Task not found or AI does not have access.");
    }

    // 2. Verify the task is delegated to the AI
    if (!task.is_delegated) {
      throw new AuthorizationError("AI can only propose status changes for delegated tasks.");
    }

    // 3. Validate and map the proposed status ID
    const { new_status_id } = command;
    const PENDING_STATUS_MAP: Record<number, number> = {
      2: 4, // Propose 'Done' -> Set 'Done, pending acceptance'
      3: 5, // Propose 'Canceled' -> Set 'Canceled, pending confirmation'
    };

    if (!Object.keys(PENDING_STATUS_MAP).map(Number).includes(new_status_id)) {
      throw new InvalidStateError(
        "Invalid status transition proposed. AI can only propose 'Done' (2) or 'Canceled' (3)."
      );
    }

    const pendingStatusId = PENDING_STATUS_MAP[new_status_id];

    // 4. Call the RPC function to perform the update and comment creation in a transaction
    const { data: updatedTask, error: rpcError } = await this.supabase
      .rpc("propose_task_status", {
        p_task_id: taskId,
        p_new_status_id: pendingStatusId,
        p_comment_text: command.comment,
        p_author_is_ai: true,
      })
      .select()
      .single();

    if (rpcError || !updatedTask) {
      console.error("RPC error proposing task status:", rpcError);
      throw new Error("Failed to propose task status change.");
    }

    return updatedTask;
  }

  public async acceptStatusProposal(taskId: string, userId: string): Promise<Task> {
    const { data, error } = await this.supabase
      .rpc("accept_task_proposal", {
        p_task_id: taskId,
        p_user_id: userId,
      })
      .single();

    if (error) {
      if (error.code === "PGRST" && error.message.includes("task not found")) {
        throw new TaskNotFoundError();
      }
      if (error.code === "42501") {
        throw new AuthorizationError();
      }
      if (error.code === "23514") {
        throw new InvalidStateError("Task is not pending acceptance.");
      }
      console.error("RPC error accepting task proposal:", error);
      throw new Error("Failed to accept task proposal.");
    }

    if (!data) {
      // This case should ideally be covered by the RPC's 'not found' error,
      // but it's good practice to have a fallback.
      throw new TaskNotFoundError();
    }

    return data;
  }

  public async rejectProposal(taskId: string, userId: string, comment: string): Promise<Task> {
    // 1. Fetch the task and its project to verify ownership
    const { data: task, error: fetchError } = await this.supabase
      .from("tasks")
      .select("*, project:projects(user_id)")
      .eq("id", taskId)
      .single();

    if (fetchError || !task) {
      throw new TaskNotFoundError();
    }

    // 2. Verify user ownership
    if (task.project?.user_id !== userId) {
      throw new AuthorizationError();
    }

    // 3. Check if the task is awaiting acceptance
    const validStatusIds = [4, 5]; // 4: Done, pending acceptance, 5: Canceled, pending confirmation
    if (!validStatusIds.includes(task.status_id)) {
      throw new InvalidStateError("This task is not awaiting acceptance and its proposal cannot be rejected.");
    }

    // 4. Call the RPC function to perform the rejection
    const { data: updatedTask, error: rpcError } = await this.supabase
      .rpc("reject_task_proposal", {
        p_task_id: taskId,
        p_comment_text: comment,
      })
      .select()
      .single();

    if (rpcError || !updatedTask) {
      console.error("RPC error rejecting task proposal:", rpcError);
      throw new Error("Failed to reject task proposal.");
    }

    return updatedTask;
  }

  public async reorderTasks(
    userId: string,

    dto: ReorderTasksDto
  ): Promise<void> {
    const taskIds = dto.tasks.map((t) => t.id);

    // 1. Fetch all tasks at once

    const { data: tasks, error: fetchError } = await this.supabase

      .from("tasks")

      .select("id, project_id")

      .in("id", taskIds);

    if (fetchError) {
      console.error("Error fetching tasks for reorder:", fetchError);

      throw new Error("Could not fetch tasks for reordering.");
    }

    // 2. Verify all tasks were found

    if (tasks.length !== taskIds.length) {
      const foundIds = new Set(tasks.map((t) => t.id));

      const notFound = taskIds.filter((id) => !foundIds.has(id));

      throw new TaskNotFoundError(`Tasks not found: ${notFound.join(", ")}`);
    }

    // 3. Verify all tasks belong to the same project and get the project ID

    const projectId = tasks[0]?.project_id;

    if (!projectId || !tasks.every((t) => t.project_id === projectId)) {
      throw new InvalidStateError("All tasks must belong to the same project.");
    }

    // 4. Verify user has access to this project

    const { data: project, error: projectError } = await this.supabase

      .from("projects")

      .select("id")

      .eq("id", projectId)

      .eq("user_id", userId)

      .single();

    if (projectError || !project) {
      throw new AuthorizationError("User does not have access to this project.");
    }

    // 5. Call RPC to update positions in a transaction

    const { error: rpcError } = await this.supabase.rpc("reorder_tasks", {
      tasks_to_reorder: dto.tasks,
    });

    if (rpcError) {
      console.error("RPC error reordering tasks:", rpcError);

      throw new Error("Failed to reorder tasks.");
    }
  }

  public async getBreadcrumbs(
    projectId: string,
    taskId: string | undefined,
    supabase: SupabaseClient
  ): Promise<IBreadcrumb[]> {
    const breadcrumbs: IBreadcrumb[] = [{ name: "Projects", href: "/projects" }];

    // 1. Get project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, name")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      throw new ProjectNotFoundError();
    }

    breadcrumbs.push({
      name: project.name,
      href: `/projects/${project.id}`,
    });

    if (!taskId) {
      breadcrumbs[breadcrumbs.length - 1].current = true;
      return breadcrumbs;
    }

    // 2. Recursively fetch parent tasks
    const taskCrumbs: IBreadcrumb[] = [];
    let currentTaskId: string | null = taskId;

    while (currentTaskId) {
      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .select("id, title, parent_id")
        .eq("id", currentTaskId)
        .single();

      if (taskError || !task) {
        // If a task in the chain is not found, stop building the breadcrumb
        break;
      }

      taskCrumbs.unshift({
        name: task.title,
        href: `/projects/${projectId}/tasks/${task.id}`,
      });

      currentTaskId = task.parent_id;
    }

    // 3. Combine and set the 'current' flag
    const finalBreadcrumbs = [...breadcrumbs, ...taskCrumbs];
    if (finalBreadcrumbs.length > 0) {
      finalBreadcrumbs[finalBreadcrumbs.length - 1].current = true;
    }

    return finalBreadcrumbs;
  }
}
