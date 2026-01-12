import { describe, it, expect, vi } from "vitest";
import { TaskService } from "./task.service";
import { AuthorizationError, ProjectNotFoundError, TaskNotFoundError } from "../errors";
import type { TaskCreateCommand } from "@/types";

// Helper to create a fully chainable mock for a single test
const createChainableMock = () => {
  const mock: any = {
    rpc: vi.fn(() => mock),
    from: vi.fn(() => mock),
    select: vi.fn(() => mock),
    insert: vi.fn(() => mock),
    update: vi.fn(() => mock),
    eq: vi.fn(() => mock),
    is: vi.fn(() => mock),
    in: vi.fn(() => mock),
    order: vi.fn(() => mock),
    limit: vi.fn(() => mock),
    single: vi.fn(),
  };
  return mock;
};

describe("TaskService", () => {
  describe("createTask", () => {
    describe("AI Role Logic", () => {
      const auth = { projectId: "ai-proj-1" };
      const command: TaskCreateCommand = {
        project_id: "ai-proj-1",
        parent_id: "parent-task-1",
        title: "New AI Subtask",
        description: "AI is creating this",
      };

      it("should call create_ai_subtask RPC when creating a sub-task", async () => {
        const mockSupabase = createChainableMock();
        const taskService = new TaskService(mockSupabase);
        const mockNewTask = { id: "task-123", ...command };
        mockSupabase.single.mockResolvedValue({ data: mockNewTask, error: null });

        await taskService.createTask(command, auth);

        expect(mockSupabase.rpc).toHaveBeenCalledWith("create_ai_subtask_and_lock_parent", expect.any(Object));
      });

      it("should throw AuthorizationError if AI tries to create a root task (no parent_id)", async () => {
        const mockSupabase = createChainableMock();
        const taskService = new TaskService(mockSupabase);
        const rootTaskCommand = { ...command, parent_id: null };

        await expect(taskService.createTask(rootTaskCommand, auth)).rejects.toThrow(AuthorizationError);
      });

      it("should translate RPC error 'Parent task not found' to TaskNotFoundError", async () => {
        // Suppress console.error for this expected error test
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        const mockSupabase = createChainableMock();
        const taskService = new TaskService(mockSupabase);
        mockSupabase.single.mockResolvedValue({ data: null, error: { message: "Parent task not found" } });

        await expect(taskService.createTask(command, auth)).rejects.toThrow(TaskNotFoundError);

        consoleSpy.mockRestore();
      });
    });

    describe("User Role Logic", () => {
      const auth = { userId: "user-123" };
      const command: TaskCreateCommand = {
        project_id: "user-proj-1",
        parent_id: null,
        title: "New User Task",
        description: "User is creating this",
      };

      it("should create a task using standard insert for a user", async () => {
        const mockSupabase = createChainableMock();
        const taskService = new TaskService(mockSupabase);

        const mockProject = { id: "user-proj-1" };
        const mockLastTask = { position: 2 };
        const mockNewTask = { id: "new-task-id", ...command, position: 3 };

        mockSupabase.single
          .mockResolvedValueOnce({ data: mockProject, error: null }) // Project check
          .mockResolvedValueOnce({ data: mockLastTask, error: null }) // Position check
          .mockResolvedValueOnce({ data: mockNewTask, error: null }); // Insert result

        await taskService.createTask(command, auth);

        expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({ position: 3 }));
      });

      it("should throw ProjectNotFoundError if project does not exist", async () => {
        const mockSupabase = createChainableMock();
        const taskService = new TaskService(mockSupabase);
        mockSupabase.single.mockResolvedValue({ data: null, error: { message: "Not found" } });

        await expect(taskService.createTask(command, auth)).rejects.toThrow(ProjectNotFoundError);
      });
    });
  });

  describe("updateTask", () => {
    const taskId = "task-to-update";

    describe("User Role Logic", () => {
      const auth = { userId: "user-123" };

      it("should allow a user to update their own, non-AI-created task", async () => {
        const mockSupabase = createChainableMock();
        const taskService = new TaskService(mockSupabase);
        const existingTask = { id: taskId, created_by_ai: false, projects: { user_id: "user-123" } };
        const updatedData = { title: "New Title" };

        mockSupabase.single
          .mockResolvedValueOnce({ data: existingTask, error: null })
          .mockResolvedValueOnce({ data: { ...existingTask, ...updatedData }, error: null });

        await taskService.updateTask(taskId, updatedData, auth);
        expect(mockSupabase.update).toHaveBeenCalledWith(updatedData);
      });

      it("should throw AuthorizationError when a user tries to update an AI-created task", async () => {
        const mockSupabase = createChainableMock();
        const taskService = new TaskService(mockSupabase);
        const existingTask = { id: taskId, created_by_ai: true, projects: { user_id: "user-123" } };
        mockSupabase.single.mockResolvedValue({ data: existingTask, error: null });

        await expect(taskService.updateTask(taskId, { title: "new" }, auth)).rejects.toThrow(AuthorizationError);
      });
    });

    describe("AI Role Logic", () => {
      const auth = { aiProjectId: "ai-proj-1" };

      it("should throw AuthorizationError when AI tries to directly update a delegated task", async () => {
        const mockSupabase = createChainableMock();
        const taskService = new TaskService(mockSupabase);
        const existingTask = { id: taskId, project_id: "ai-proj-1", created_by_ai: false };
        mockSupabase.single.mockResolvedValue({ data: existingTask, error: null });

        await expect(taskService.updateTask(taskId, { description: "..." }, auth)).rejects.toThrow(AuthorizationError);
      });

      it("should allow AI to update status of its own sub-task to Done (2) or Canceled (3)", async () => {
        const mockSupabase = createChainableMock();
        const taskService = new TaskService(mockSupabase);
        const existingTask = { id: taskId, project_id: "ai-proj-1", created_by_ai: true };
        
        mockSupabase.single
          .mockResolvedValueOnce({ data: existingTask, error: null })
          .mockResolvedValueOnce({ data: { ...existingTask, status_id: 2 }, error: null });

        await taskService.updateTask(taskId, { status_id: 2 }, auth);
        expect(mockSupabase.update).toHaveBeenLastCalledWith({ status_id: 2 });
        
        mockSupabase.single
            .mockResolvedValueOnce({ data: existingTask, error: null })
            .mockResolvedValueOnce({ data: { ...existingTask, status_id: 3 }, error: null });

        await taskService.updateTask(taskId, { status_id: 3 }, auth);
        expect(mockSupabase.update).toHaveBeenLastCalledWith({ status_id: 3 });
      });

      it("should throw AuthorizationError if AI tries to change its sub-task to an invalid status", async () => {
        const mockSupabase = createChainableMock();
        const taskService = new TaskService(mockSupabase);
        const existingTask = { id: taskId, project_id: "ai-proj-1", created_by_ai: true };
        mockSupabase.single.mockResolvedValue({ data: existingTask, error: null });

        await expect(taskService.updateTask(taskId, { status_id: 1 }, auth)).rejects.toThrow(AuthorizationError);
      });

      it("should throw AuthorizationError if AI tries to change the delegation status", async () => {
        const mockSupabase = createChainableMock();
        const taskService = new TaskService(mockSupabase);
        const existingTask = { id: taskId, project_id: "ai-proj-1", created_by_ai: false };
        mockSupabase.single.mockResolvedValue({ data: existingTask, error: null });
        
        await expect(taskService.updateTask(taskId, { is_delegated: false }, auth)).rejects.toThrow(AuthorizationError);
      });
    });
  });
});