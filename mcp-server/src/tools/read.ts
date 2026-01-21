import { z } from "zod";
import { apiClient } from "../api-client.js";

export const getTaskHierarchyTool = {
  name: "get_task_hierarchy",
  description: "Retrieves the full hierarchy (tree structure) of all tasks in the project. Use this to understand the project structure and context.",
  inputSchema: z.object({}),
  execute: async (_args: any) => {
    const tasks = await apiClient.getTaskHierarchy();
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(tasks, null, 2),
        },
      ],
    };
  },
};

export const listDelegatedTasksTool = {
  name: "list_delegated_tasks",
  description: "Retrieves a list of tasks that have been specifically delegated to the AI assistant. These are your priority items.",
  inputSchema: z.object({}),
  execute: async (_args: any) => {
    const tasks = await apiClient.listDelegatedTasks();
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(tasks, null, 2),
        },
      ],
    };
  },
};
