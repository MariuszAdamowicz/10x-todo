import type { SupabaseClient } from '@/db/supabase.client';
import type { Task, TaskCreateCommand } from '@/types';
import { projectService } from './project.service';

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

class TaskService {
  public async getTasks(
    supabase: SupabaseClient,
    options: GetTasksOptions,
  ): Promise<{ data: Task[]; count: number }> {
    const { filters, pagination, auth } = options;

    // 1. Determine Project ID and check for auth
    let projectId = filters.projectId;
    if (auth.aiProjectId) {
      projectId = auth.aiProjectId;
    }

    if (auth.userId) {
      if (!filters.projectId) {
        throw new Error('Project ID is required for user-based queries.');
      }
      // Verify user has access to the project
      const project = await projectService.getProjectById(supabase, filters.projectId, auth.userId);
      if (!project) {
        throw new Error('Project not found or user does not have access.');
      }
    }

    if (!projectId) {
      throw new Error('Project ID could not be determined.');
    }

    // 2. Build dynamic query
    const query = supabase.from('tasks').select('*', { count: 'exact' });

    // 3. Apply filters
    query.eq('project_id', projectId);

    if (filters.parentId) {
      query.eq('parent_id', filters.parentId);
    } else {
      query.is('parent_id', null);
    }

    if (filters.statusId) {
      query.eq('status_id', filters.statusId);
    }

    if (filters.delegated !== undefined) {
      query.eq('is_delegated', filters.delegated);
    }

    // 4. Apply pagination
    const { page, limit } = pagination;
    const rangeFrom = (page - 1) * limit;
    const rangeTo = page * limit - 1;
    query.range(rangeFrom, rangeTo);

    // 5. Execute query
    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching tasks:', error);
      throw new Error('Failed to fetch tasks.');
    }

    return { data: data || [], count: count || 0 };
  }

  public async createTask(
    supabase: SupabaseClient,
    command: TaskCreateCommand,
    auth: { userId?: string; projectId?: string },
  ): Promise<Task> {
    // 1. Determine Project ID and check for auth
    const projectId = auth.userId ? command.project_id : auth.projectId;
    const createdByAi = !!auth.projectId;

    if (!projectId) {
      throw new Error('Project ID is required to create a task.');
    }

    // 2. Verify project exists and user has access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      throw new Error('Project not found or user does not have access.');
    }

    // 3. Validate parent_id if provided
    if (command.parent_id) {
      const { data: parentTask, error: parentError } = await supabase
        .from('tasks')
        .select('id, project_id, is_delegated')
        .eq('id', command.parent_id)
        .single();

      if (parentError || !parentTask) {
        throw new Error('Parent task not found.');
      }

      if (parentTask.project_id !== projectId) {
        throw new Error('Parent task does not belong to the specified project.');
      }

      // AI-specific rules
      if (createdByAi && !parentTask.is_delegated) {
        throw new Error('AI can only create sub-tasks for delegated tasks.');
      }
    }

    // 4. Calculate new position
    const positionQuery = supabase
      .from('tasks')
      .select('position')
      .eq('project_id', projectId);

    if (command.parent_id) {
      positionQuery.eq('parent_id', command.parent_id);
    } else {
      positionQuery.is('parent_id', null);
    }

    const { data: lastTask, error: positionError } = await positionQuery
      .order('position', { ascending: false })
      .limit(1)
      .single();

    if (positionError && positionError.code !== 'PGRST116') {
      // PGRST116: 'exact-single' - no rows found, which is fine.
      throw new Error('Could not determine task position.');
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

    const { data: newTask, error: insertError } = await supabase
      .from('tasks')
      .insert(newTaskData)
      .select()
      .single();

    if (insertError || !newTask) {
      console.error('Supabase insert error:', insertError);
      throw new Error('Failed to create task.');
    }

    return newTask;
  }
}

export const taskService = new TaskService();
