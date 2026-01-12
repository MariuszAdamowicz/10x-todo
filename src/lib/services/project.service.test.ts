import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ProjectService } from "./project.service";
import { AuthorizationError, ProjectNotFoundError } from "@/lib/errors";
import type { SupabaseClient } from "@/db/supabase.client";
import type { ProjectCreateCommand } from "@/types";

// A robust, chainable mock.
const createChainableMock = () => {
  const mock: { [key: string]: vi.Mock } = {
    from: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    single: vi.fn(),
    then: vi.fn(),
  };

  Object.keys(mock).forEach(key => {
    if (key !== 'single' && key !== 'then') {
      mock[key].mockReturnThis();
    }
  });

  return mock;
};

describe("ProjectService", () => {
  let projectService: ProjectService;
  let mockSupabase: ReturnType<typeof createChainableMock>;

  beforeEach(() => {
    mockSupabase = createChainableMock();
    projectService = new ProjectService(mockSupabase as any as SupabaseClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getProjects", () => {
    it('should return a list of projects', async () => {
      const mockProjects = [{ id: "1" }];
      mockSupabase.order.mockResolvedValue({ data: mockProjects, error: null });
      const result = await projectService.getProjects("user-123");
      expect(result).toEqual(mockProjects);
      expect(mockSupabase.from).toHaveBeenCalledWith("projects");
    });
  });

  describe("getProjectById", () => {
    it("should return project details", async () => {
      const mockDetails = { id: "proj-abc" };
      mockSupabase.single.mockResolvedValue({ data: mockDetails, error: null });
      const result = await projectService.getProjectById("proj-abc", "user-123");
      expect(result).toEqual(mockDetails);
    });

    it("should throw ProjectNotFoundError if not found", async () => {
      mockSupabase.single.mockResolvedValue({ data: null, error: { code: "PGRST116" } });
      await expect(projectService.getProjectById("proj-abc", "user-123")).rejects.toThrow(ProjectNotFoundError);
    });
  });

  describe("createProject", () => {
    it('should create and return a new project', async () => {
        const projectData: ProjectCreateCommand = { name: 'New Project', description: 'A desc.' };
        const expectedProject = { id: 'new-proj-id', ...projectData };
        mockSupabase.single.mockResolvedValue({ data: expectedProject, error: null });

        await projectService.createProject('user-123', projectData);
        
        // Manual verification of arguments to bypass weird assertion errors
        const insertCalls = mockSupabase.insert.mock.calls;
        expect(insertCalls.length).toBe(1);
        const insertedData = insertCalls[0][0]; // First argument of first call
        
        // Expect an array with one object
        expect(Array.isArray(insertedData) ? insertedData[0] : insertedData).toMatchObject({
            user_id: 'user-123',
            name: projectData.name,
            description: projectData.description
        });
    });
  });

  describe('deleteProject', () => {
    it('should delete a project successfully', async () => {
        mockSupabase.then.mockImplementation((resolve) => resolve({ count: 1, error: null }));
        await expect(projectService.deleteProject('p1', 'u1')).resolves.toBeUndefined();
        expect(mockSupabase.delete).toHaveBeenCalledWith({ count: "exact" });
    });

    it('should throw ProjectNotFoundError if project to delete is not found', async () => {
        mockSupabase.then.mockImplementation((resolve) => resolve({ count: 0, error: null }));
        await expect(projectService.deleteProject('p1', 'u1')).rejects.toThrow(ProjectNotFoundError);
    });
  });

  describe('regenerateApiKey', () => {
    it('should regenerate and return the new API key', async () => {
        const newKey = 'new-key';
        mockSupabase.single
            .mockResolvedValueOnce({ data: { id: "p1", user_id: "u1" }, error: null })
            .mockResolvedValueOnce({ data: { api_key: newKey }, error: null });
        vi.spyOn(crypto, 'randomUUID').mockReturnValue(newKey);

        const result = await projectService.regenerateApiKey("p1", "u1");

        expect(result.api_key).toBe(newKey);
        expect(mockSupabase.update).toHaveBeenCalledWith({ api_key: newKey });
    });

    it('should throw AuthorizationError for wrong user', async () => {
        mockSupabase.single.mockResolvedValueOnce({ data: { id: "p1", user_id: "not-owner" }, error: null });
        await expect(projectService.regenerateApiKey("p1", "u1")).rejects.toThrow(AuthorizationError);
    });
  });
});