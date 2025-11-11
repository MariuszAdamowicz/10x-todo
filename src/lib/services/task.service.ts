import type { SupabaseClient } from "@/db/supabase.client";
import type {
  Task,
  TaskCreateCommand,
  TaskProposeStatusCommand,
  TaskUpdateCommand,
} from "@/types";
import {
  AuthorizationError,
  InvalidStateError,
  ProjectNotFoundError,
  TaskNotFoundError,
} from "../errors";

export interface GetTasksFilters {
  projectId?: string;
  parentId?: string;
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

  public async getTasks(
    options: GetTasksOptions
  ): Promise<{ data: Task[]; count: number }> {
    const { filters, pagination, auth } = options;

    // 1. Determine Project ID and check for auth
    let projectId = filters.projectId;
    if (auth.aiProjectId) {
      projectId = auth.aiProjectId;
    }

    if (auth.userId) {
      if (!filters.projectId) {
        throw new Error("Project ID is required for user-based queries.");
      }
      // Verify user has access to the project
      const { data: project } = await this.supabase
        .from("projects")
        .select("id")
        .eq("id", filters.projectId)
        .eq("user_id", auth.userId)
        .single();

      if (!project) {
        throw new ProjectNotFoundError("Project not found or user does not have access.");
      }
    }

    if (!projectId) {
      throw new Error("Project ID could not be determined.");
    }

    // 2. Build dynamic query
    const query = this.supabase.from("tasks").select("*", { count: "exact" });

    // 3. Apply filters
    query.eq("project_id", projectId);

    if (filters.parentId) {
      query.eq("parent_id", filters.parentId);
    } else {
      query.is("parent_id", null);
    }

    if (filters.statusId) {
      query.eq("status_id", filters.statusId);
    }

    if (filters.delegated !== undefined) {
      query.eq("is_delegated", filters.delegated);
    }

    // 4. Apply pagination
    const { page, limit } = pagination;
    const rangeFrom = (page - 1) * limit;
    const rangeTo = page * limit - 1;
    query.range(rangeFrom, rangeTo);

    // 5. Execute query
    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching tasks:", error);
      throw new Error("Failed to fetch tasks.");
    }

    return { data: data || [], count: count || 0 };
  }

  public async createTask(
    command: TaskCreateCommand,
    auth: { userId?: string; projectId?: string }
  ): Promise<Task> {
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
        throw new AuthorizationError(
          "Parent task does not belong to the specified project."
        );
      }

      // AI-specific rules
      if (createdByAi && !parentTask.is_delegated) {
        throw new AuthorizationError("AI can only create sub-tasks for delegated tasks.");
      }
    }

    // 4. Calculate new position
    const positionQuery = this.supabase
      .from("tasks")
      .select("position")
      .eq("project_id", projectId);

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
  public async getTaskById({
    taskId,
  }: {
    taskId: string;
  }): Promise<Task> {
    const { data, error } = await this.supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .single();

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
        throw new AuthorizationError(
          "AI is not allowed to change the task status directly."
        );
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

    if (
      !Object.keys(PENDING_STATUS_MAP).map(Number).includes(new_status_id)
    ) {
      throw new InvalidStateError("Invalid status transition proposed. AI can only propose 'Done' (2) or 'Canceled' (3).");
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

  public async acceptStatusProposal(
    taskId: string,
    userId: string
  ): Promise<Task> {
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

    // 3. Check current status and determine the new status
    const currentStatusId = task.status_id;
    let newStatusId: number;

    if (currentStatusId === 4) {
      // 'Done, pending acceptance' -> 'Done'
      newStatusId = 2;
    } else if (currentStatusId === 5) {
      // 'Canceled, pending confirmation' -> 'Canceled'
      newStatusId = 3;
    } else {
      throw new InvalidStateError(
        "This task is not awaiting acceptance."
      );
    }

    // 4. Update the task status
    const { data: updatedTask, error: updateError } = await this.supabase
      .from("tasks")
      .update({ status_id: newStatusId })
      .eq("id", taskId)
      .select()
      .single();

    if (updateError || !updatedTask) {
      console.error("Error updating task status:", updateError);
      throw new Error("Failed to update task status.");
    }

    return updatedTask;
  }

  public async rejectProposal(
    taskId: string,
    userId: string,
    comment: string
  ): Promise<Task> {
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
      throw new InvalidStateError(
        "This task is not awaiting acceptance and its proposal cannot be rejected."
      );
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
}
