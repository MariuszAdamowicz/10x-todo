import { z } from "zod";
import { safeFetch } from "../api-client.js";

// Mapowanie statusów tekstowych MCP na status_id z bazy danych
const STATUS_MAP: Record<string, number> = {
  todo: 1,
  done: 2,
  cancelled: 3,
};

export const createSubtaskTool = {
  name: "create_subtask",
  description:
    "Creates a new subtask under a specific parent task. Use this to break down complex tasks into smaller, manageable units.",
  inputSchema: z.object({
    parentId: z.string().uuid().describe("The UUID of the parent task"),
    title: z.string().min(1).describe("The title of the subtask"),
    description: z.string().optional().describe("A detailed description of the subtask"),
  }),
  execute: async (args: { parentId: string; title: string; description?: string }) => {
    const result = await safeFetch("/tasks", {
      method: "POST",
      body: JSON.stringify({
        parent_id: args.parentId,
        title: args.title,
        description: args.description,
      }),
    });
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
};

export const updateSubtaskStatusTool = {
  name: "update_subtask_status",
  description: "Updates the status of a subtask. Allowed statuses are: todo, done, cancelled.",
  inputSchema: z.object({
    taskId: z.string().uuid().describe("The UUID of the task to update"),
    status: z.enum(["todo", "done", "cancelled"]).describe("The new status"),
  }),
  execute: async (args: { taskId: string; status: string }) => {
    const statusId = STATUS_MAP[args.status];
    const result = await safeFetch(`/tasks/${args.taskId}`, {
      method: "PATCH",
      body: JSON.stringify({ status_id: statusId }),
    });
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
};

export const proposeTaskResolutionTool = {
  name: "propose_task_resolution",
  description:
    "Proposes a resolution (done or cancelled) for a delegated task. This requires a comment explaining the result or reason for cancellation.",
  inputSchema: z.object({
    taskId: z.string().uuid().describe("The UUID of the task"),
    status: z.enum(["done", "cancelled"]).describe("The proposed status"),
    comment: z.string().min(5).describe("A comment explaining the work done or reason for cancellation"),
  }),
  execute: async (args: { taskId: string; status: string; comment: string }) => {
    const statusId = STATUS_MAP[args.status];
    const result = await safeFetch(`/tasks/${args.taskId}/propose-status`, {
      method: "POST",
      body: JSON.stringify({ new_status_id: statusId, comment: args.comment }),
    });
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
};

export const reorderTasksTool = {
  name: "reorder_tasks",
  description: "Reorders a list of tasks. Use this to prioritize subtasks or organize the task list logically.",
  inputSchema: z.object({
    tasks: z
      .array(
        z.object({
          id: z.string().uuid().describe("The UUID of the task"),
          order: z.number().int().min(0).describe("The new position order (0-based)"),
        })
      )
      .describe("List of tasks with their new order"),
  }),
  execute: async (args: { tasks: { id: string; order: number }[] }) => {
    const result = await safeFetch("/tasks/reorder", {
      method: "POST",
      body: JSON.stringify({ tasks: args.tasks }),
    });
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
};
