import { getTaskHierarchyTool, listDelegatedTasksTool } from "./read.js";
import { createSubtaskTool, updateSubtaskStatusTool, proposeTaskResolutionTool } from "./write.js";

export const tools = [
  getTaskHierarchyTool,
  listDelegatedTasksTool,
  createSubtaskTool,
  updateSubtaskStatusTool,
  proposeTaskResolutionTool,
];