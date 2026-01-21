// Copied and adapted from src/db/database.types.ts and src/types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// Minimal Database definition for Type extraction
export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          api_key: string;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          user_id: string;
        };
      };
      tasks: {
        Row: {
          created_at: string;
          created_by_ai: boolean;
          description: string | null;
          id: string;
          is_delegated: boolean;
          parent_id: string | null;
          position: number;
          project_id: string;
          status_id: number;
          title: string;
          updated_at: string;
        };
      };
      task_statuses: {
        Row: {
          id: number;
          name: string;
        };
      };
      task_comments: {
        Row: {
            author_is_ai: boolean;
            comment: string;
            created_at: string;
            id: string;
            new_status_id: number | null;
            previous_status_id: number | null;
            task_id: string;
        };
      };
    };
  };
}

// Helpers to extract Row types
type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];

// #region Entity Types

export type Project = Tables<"projects">;
export type BaseTask = Tables<"tasks">;
export type TaskStatus = Tables<"task_statuses">;
export type TaskComment = Tables<"task_comments">;

export interface Task extends BaseTask {
  delegation_locked_at?: string | null;
  active_subtask_count: number;
  completed_subtask_count: number;
  canceled_subtask_count: number;
}

export type TaskWithComments = Task & { task_comments?: TaskComment[] };

// #endregion

// #region DTOs

export type TaskGetDto = Task;

export interface TaskProposeStatusCommand {
  new_status_id: number;
  comment: string;
}

// #endregion
