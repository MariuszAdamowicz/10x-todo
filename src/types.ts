import { z } from 'zod';
import type { ReorderTasksDtoSchema } from './lib/schemas/task.schemas';
import type { Tables } from '@/db/database.types';

// #region Base Entity Types
// These are direct references to the database table types.

/** Represents the full "projects" table entity. */
export type Project = Tables<'projects'>;

/** Represents the full "tasks" table entity. */
export type Task = Tables<'tasks'>;

/** Represents the full "task_statuses" table entity. */
export type TaskStatus = Tables<'task_statuses'>;

/** Represents the full "task_comments" table entity. */
export type TaskComment = Tables<'task_comments'>;

// #endregion

// #region Project DTOs and Command Models

/**
 * DTO for getting a list of projects.
 * Omits sensitive or irrelevant fields for a summary view.
 * Used in: `GET /projects`
 */
export type ProjectGetDto = Pick<Project, 'id' | 'name' | 'description' | 'created_at'>;

/**
 * DTO for getting the detailed view of a single project.
 * Includes the `api_key` which should be handled with care.
 * Used in: `GET /projects/{id}`
 */
export type ProjectGetDetailsDto = Pick<
	Project,
	'id' | 'name' | 'description' | 'api_key' | 'created_at'
>;

/**
 * Command model for creating a new project.
 * Specifies the fields required from the client.
 * Used in: `POST /projects`
 */
export type ProjectCreateCommand = Pick<Project, 'name' | 'description'>;

/**
 * DTO for the result of creating a new project.
 * Returns the full new project entity, including the generated `api_key`.
 * Used in: `POST /projects` (Response)
 */
export type ProjectCreateResultDto = Project;

/**
 * Command model for updating an existing project.
 * Specifies the fields that can be updated by the client.
 * Used in: `PUT /projects/{id}`
 */
export type ProjectUpdateCommand = Pick<Project, 'name' | 'description'>;

/**
 * DTO for the result of updating a project.
 * Returns the complete, updated project entity.
 * Used in: `PUT /projects/{id}` (Response)
 */
export type ProjectUpdateResultDto = Project;

/**
 * DTO for the result of regenerating a project's API key.
 * Returns only the new `api_key`.
 * Used in: `POST /projects/{id}/regenerate-api-key` (Response)
 */
export type RegenerateApiKeyResultDto = Pick<Project, 'api_key'>;

// #endregion

// #region Task DTOs and Command Models

/**
 * DTO for getting a list of tasks.
 * Represents the full task entity.
 * Used in: `GET /tasks`, `GET /tasks/{id}`
 */
export type TaskGetDto = Task;

/**
 * Command model for creating a new task.
 * `project_id` is optional because for AI agents, it's inferred from the API key.
 * Used in: `POST /tasks`
 */
export type TaskCreateCommand = Pick<Task, 'parent_id' | 'title' | 'description'> &
	Partial<Pick<Task, 'project_id'>>;

/**
 * Command model for updating a task.
 * All fields are optional as per the PATCH method.
 * `is_delegated` can only be updated by a human user.
 * Used in: `PATCH /tasks/{id}`
 */
export type TaskUpdateCommand = Partial<
	Pick<Task, 'title' | 'description' | 'status_id' | 'is_delegated'>
>;

/**
 * Command model for an AI to propose a status change for a task.
 * Requires the new status and a comment explaining the change.
 * Used in: `POST /tasks/{id}/propose-status`
 */
export type TaskProposeStatusCommand = {
	new_status_id: Task['status_id'];
	comment: TaskComment['comment'];
};

/**
 * Command model for a user to reject an AI's proposed status change.
 * Requires a comment explaining the reason for rejection.
 * Used in: `POST /tasks/{id}/reject-proposal`
 */
export type TaskRejectProposalCommand = Pick<TaskComment, 'comment'>;

/**
 * DTO for reordering tasks.
 * This type is inferred from the Zod schema `ReorderTasksDtoSchema`.
 * Used in: `POST /tasks/reorder`
 */
export type ReorderTasksDto = z.infer<typeof ReorderTasksDtoSchema>;

// #endregion

// #region Task Status DTOs

/**
 * DTO for getting the list of all possible task statuses.
 * Used in: `GET /task-statuses`
 */
export type TaskStatusGetDto = TaskStatus;

// #endregion
