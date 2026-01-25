import type { ApiClient } from "../api-client.js";

// We define resources as an array of configuration objects to be registered in index.ts
export const getResources = (apiClient: ApiClient) => [
  {
    uri: "todo://tasks/delegated",
    name: "Delegated Tasks",
    description: "A dynamic list of tasks delegated to the AI assistant",
    mimeType: "application/json",
    read: async () => {
      const tasks = await apiClient.listDelegatedTasks();
      return [
        {
          uri: "todo://tasks/delegated",
          mimeType: "application/json",
          text: JSON.stringify(tasks, null, 2),
        },
      ];
    },
  },
  {
    uri: "todo://tasks/all",
    name: "All Tasks",
    description: "Full hierarchy of all tasks in the project",
    mimeType: "application/json",
    read: async () => {
      const tasks = await apiClient.getTaskHierarchy();
      return [
        {
          uri: "todo://tasks/all",
          mimeType: "application/json",
          text: JSON.stringify(tasks, null, 2),
        },
      ];
    },
  },
];
