import { describe, it, expect, vi } from "vitest";
import { TaskService } from "./task.service";
import { AuthorizationError, InvalidStateError, ProjectNotFoundError, TaskNotFoundError } from "../errors";
import type { TaskCreateCommand, GetTasksOptions } from "@/types";

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
  describe("Role-Specific Business Logic (AI vs. User)", () => {
    describe("User Role", () => {
      const auth = { userId: "user-123" };

      it("should allow a user to create a root task", async () => {
        const mockSupabase = createChainableMock();
        const taskService = new TaskService(mockSupabase);
        const command: TaskCreateCommand = { project_id: "p1", parent_id: null, title: "t" };

        mockSupabase.single
          .mockResolvedValueOnce({ data: { id: "p1" }, error: null })
          .mockResolvedValueOnce({ data: null, error: { code: "PGRST116" } })
          .mockResolvedValueOnce({ data: { id: "t1", ...command }, error: null });

        await taskService.createTask(command, auth);
        expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({ project_id: "p1" }));
      });

      it("should allow a user to update their own, non-AI-created task", async () => {
        const mockSupabase = createChainableMock();
        const taskService = new TaskService(mockSupabase);
        const existingTask = { id: "t1", created_by_ai: false, projects: { user_id: auth.userId } };
        const updatedData = { title: "New Title" };

        mockSupabase.single
          .mockResolvedValueOnce({ data: existingTask, error: null })
          .mockResolvedValueOnce({ data: { ...existingTask, ...updatedData }, error: null });

        await taskService.updateTask("t1", updatedData, auth);
        expect(mockSupabase.update).toHaveBeenCalledWith(updatedData);
      });

      it("should throw AuthorizationError when creating a sub-task where parent belongs to another project", async () => {
        const mockSupabase = createChainableMock();
        const taskService = new TaskService(mockSupabase);
        const command: TaskCreateCommand = { project_id: "project-A", parent_id: "parent-in-B", title: "t" };

        mockSupabase.single
          .mockResolvedValueOnce({ data: { id: "project-A" }, error: null })
          .mockResolvedValueOnce({ data: { id: "parent-in-B", project_id: "project-B" }, error: null });

        await expect(taskService.createTask(command, auth)).rejects.toThrow(AuthorizationError);
      });

      it("should throw AuthorizationError when a user tries to update an AI-created task", async () => {
        const mockSupabase = createChainableMock();
        const taskService = new TaskService(mockSupabase);
        const existingTask = { id: "t1", created_by_ai: true, projects: { user_id: auth.userId } };
        mockSupabase.single.mockResolvedValue({ data: existingTask, error: null });

        await expect(taskService.updateTask("t1", { title: "new" }, auth)).rejects.toThrow(
          "Users cannot modify tasks created by the AI."
        );
      });
    });

    describe("AI Role", () => {
      it("should successfully create a sub-task via RPC", async () => {
        const mockSupabase = createChainableMock();
        const taskService = new TaskService(mockSupabase);
        const auth = { projectId: "ai-project-1" };
        const command: TaskCreateCommand = { project_id: "p1", parent_id: "parent-1", title: "t" };

        mockSupabase.single.mockResolvedValue({ data: { id: "t1" }, error: null });

        await taskService.createTask(command, auth);
        expect(mockSupabase.rpc).toHaveBeenCalledWith("create_ai_subtask_and_lock_parent", expect.any(Object));
      });

      it("should throw AuthorizationError when creating a task without a parent_id", async () => {
        const taskService = new TaskService(createChainableMock());
        const auth = { projectId: "ai-project-1" };
        const command: TaskCreateCommand = { project_id: "p1", parent_id: null, title: "t" };
        await expect(taskService.createTask(command, auth)).rejects.toThrow(
          "AI can only create sub-tasks and must provide a parent_id."
        );
      });

      it("should throw AuthorizationError when trying to directly update a main delegated task", async () => {
        const mockSupabase = createChainableMock();
        const taskService = new TaskService(mockSupabase);
        const auth = { aiProjectId: "ai-project-1" };
        const existingTask = { id: "t1", project_id: auth.aiProjectId, created_by_ai: false };
        mockSupabase.single.mockResolvedValue({ data: existingTask, error: null });

        await expect(taskService.updateTask("t1", { description: "..." }, auth)).rejects.toThrow(
          "AI can only propose status changes for delegated tasks, not update them directly."
        );
      });

      it("should throw AuthorizationError when updating a task outside of its assigned project", async () => {
        const mockSupabase = createChainableMock();
        const taskService = new TaskService(mockSupabase);
        const auth = { aiProjectId: "ai-project-1" };
        const existingTask = { id: "t1", project_id: "some-other-project", created_by_ai: true };
        mockSupabase.single.mockResolvedValue({ data: existingTask, error: null });

        await expect(taskService.updateTask("t1", { status_id: 2 }, auth)).rejects.toThrow(
          "AI agent cannot access tasks outside of its project."
        );
      });

      it("should allow AI to change status of its OWN sub-task to Done or Canceled", async () => {
        const mockSupabase = createChainableMock();
        const taskService = new TaskService(mockSupabase);
        const auth = { aiProjectId: "ai-project-1" };
        const existingTask = { id: "t1", project_id: auth.aiProjectId, created_by_ai: true };

        mockSupabase.single
          .mockResolvedValueOnce({ data: existingTask, error: null })
          .mockResolvedValueOnce({ data: { ...existingTask, status_id: 2 }, error: null });
        await taskService.updateTask("t1", { status_id: 2 }, auth);
        expect(mockSupabase.update).toHaveBeenLastCalledWith({ status_id: 2 });

        mockSupabase.single
          .mockResolvedValueOnce({ data: existingTask, error: null })
          .mockResolvedValueOnce({ data: { ...existingTask, status_id: 3 }, error: null });
        await taskService.updateTask("t1", { status_id: 3 }, auth);
        expect(mockSupabase.update).toHaveBeenLastCalledWith({ status_id: 3 });
      });

      it("should throw AuthorizationError when AI changes its sub-task to an invalid status", async () => {
        const mockSupabase = createChainableMock();
        const taskService = new TaskService(mockSupabase);
        const auth = { aiProjectId: "ai-project-1" };
        const existingTask = { id: "t1", project_id: auth.aiProjectId, created_by_ai: true };
        mockSupabase.single.mockResolvedValue({ data: existingTask, error: null });

        await expect(taskService.updateTask("t1", { status_id: 1 }, auth)).rejects.toThrow(
          "AI can only change status of its own sub-tasks to Done or Canceled."
        );
      });
    });
  });

  describe("Guard Clauses and General Error Handling", () => {
    it("getTasks should throw AuthorizationError if auth is missing", async () => {
      const taskService = new TaskService(createChainableMock());
      await expect(
        taskService.getTasks({ filters: {}, pagination: { page: 1, limit: 10 }, auth: {} })
      ).rejects.toThrow(AuthorizationError);
    });

    it("proposeTaskStatus should throw InvalidStateError for an invalid proposed status", async () => {
      const mockSupabase = createChainableMock();
      const existingTask = { id: "t1", project_id: "p1", is_delegated: true };
      mockSupabase.single.mockResolvedValue({ data: existingTask, error: null });
      const taskService = new TaskService(mockSupabase);
      await expect(
        taskService.proposeTaskStatus("t1", { new_status_id: 1, comment: "" }, { aiProjectId: "p1" })
      ).rejects.toThrow(InvalidStateError);
    });

    it("rejectProposal should throw InvalidStateError if task is not pending acceptance", async () => {
      const mockSupabase = createChainableMock();
      const existingTask = { id: "t1", status_id: 1, project: { user_id: "u1" } };
      mockSupabase.single.mockResolvedValue({ data: existingTask, error: null });
      const taskService = new TaskService(mockSupabase);
      await expect(taskService.rejectProposal("t1", "u1", "comment")).rejects.toThrow(InvalidStateError);
    });
  });

  describe("Data Transformation and Processing", () => {
    it("getTasks should transform null task_comments from RPC to an empty array", async () => {
      const mockSupabase = createChainableMock();
      const taskService = new TaskService(mockSupabase);
      const taskFromDb = { id: "t1", title: "Task with null comments", task_comments: null };
      mockSupabase.rpc.mockResolvedValue({ data: [taskFromDb], error: null });

      const { data: tasks } = await taskService.getTasks({
        filters: { projectId: "p1" },
        pagination: { page: 1, limit: 10 },
        auth: { userId: "u1" },
      });

      expect(tasks).toHaveLength(1);
      expect(tasks[0].task_comments).toEqual([]);
    });

    it("createTask should calculate position as 1 for the first task in a list", async () => {
      const mockSupabase = createChainableMock();
      const taskService = new TaskService(mockSupabase);
      const auth = { userId: "u1" };
      const command: TaskCreateCommand = { project_id: "p1", parent_id: null, title: "t" };

      mockSupabase.single
        .mockResolvedValueOnce({ data: { id: "p1" }, error: null }) // Project check
        .mockResolvedValueOnce({ data: null, error: { code: "PGRST116" } }) // Position check -> no tasks found
        .mockResolvedValueOnce({ data: { id: "t1" }, error: null }); // Insert result

      await taskService.createTask(command, auth);

      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({ position: 1 }));
    });

    it("createTask should set default status_id and created_by_ai for user-created tasks", async () => {
      const mockSupabase = createChainableMock();
      const taskService = new TaskService(mockSupabase);
      const auth = { userId: "u1" };
      const command: TaskCreateCommand = { project_id: "p1", parent_id: null, title: "t" };

      mockSupabase.single
        .mockResolvedValueOnce({ data: { id: "p1" }, error: null })
        .mockResolvedValueOnce({ data: null, error: { code: "PGRST116" } })
        .mockResolvedValueOnce({ data: { id: "t1" }, error: null });

      await taskService.createTask(command, auth);

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          status_id: 1, // To Do
          created_by_ai: false,
        })
      );
    });

    it("getTaskById should strip the nested project property before returning", async () => {
      const mockSupabase = createChainableMock();
      const taskService = new TaskService(mockSupabase);
      const taskFromDb = {
        id: "t1",
        title: "Test Task",
        project: { user_id: "u1" }, // This property should be removed
      };
      mockSupabase.single.mockResolvedValue({ data: taskFromDb, error: null });

      const task = await taskService.getTaskById({ taskId: "t1", userId: "u1" });

      expect(task).not.toHaveProperty("project");
      expect(task).toHaveProperty("id", "t1");
    });

    it('proposeTaskStatus should map proposed status "Done" (2) to pending status (4)', async () => {
      const mockSupabase = createChainableMock();
      const taskService = new TaskService(mockSupabase);
      const auth = { aiProjectId: "p1" };

      mockSupabase.single
        .mockResolvedValueOnce({ data: { id: "t1", is_delegated: true }, error: null }) // task fetch
        .mockResolvedValueOnce({ data: { id: "t1", status_id: 4 }, error: null }); // rpc result

      await taskService.proposeTaskStatus("t1", { new_status_id: 2, comment: "Done!" }, auth);

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        "propose_task_status",
        expect.objectContaining({
          p_new_status_id: 4, // "Done, pending acceptance"
        })
      );
    });
  });
});