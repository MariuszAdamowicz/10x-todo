import type { ApiClient } from "../api-client.js";
import { getTaskHierarchyTool, listDelegatedTasksTool } from "./read.js";
import { createSubtaskTool, updateSubtaskStatusTool, proposeTaskResolutionTool, reorderTasksTool } from "./write.js";

export const getTools = (apiClient: ApiClient) => [
  getTaskHierarchyTool(apiClient),
  listDelegatedTasksTool(apiClient),
  createSubtaskTool(apiClient),
  updateSubtaskStatusTool(apiClient),
  proposeTaskResolutionTool(apiClient),
  reorderTasksTool(apiClient),
];
