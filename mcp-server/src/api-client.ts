import type { Config } from "./config.js";
import type { Task } from "./types.js";

export class ApiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: Config) {
    this.baseUrl = config.TODO_API_URL.replace(/\/$/, ""); // Remove trailing slash
    this.apiKey = config.TODO_API_KEY;
  }

  private async safeFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      "X-API-Key": this.apiKey,
      ...options.headers,
    };

    try {
      const response = await fetch(url, { ...options, headers });

      if (!response.ok) {
        let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
        try {
          const errorBody = (await response.json()) as { message?: string };
          if (errorBody && errorBody.message) {
            errorMessage += ` - ${errorBody.message}`;
          }
        } catch {
          // Ignore if body is not JSON
        }

        if (response.status === 401 || response.status === 403) {
          throw new Error(`Access Denied: ${errorMessage}. Check your TODO_API_KEY.`);
        }
        throw new Error(errorMessage);
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return {} as T;
      }

      return (await response.json()) as T;
    } catch (error: unknown) {
      // Network errors or other fetch issues
      throw new Error(`API Request Failed: ${(error as Error).message || "Unknown error"}`);
    }
  }

  async getTaskHierarchy(): Promise<Task[]> {
    return this.safeFetch<Task[]>("/api/tasks");
  }

  async listDelegatedTasks(): Promise<Task[]> {
    return this.safeFetch<Task[]>("/api/tasks?delegated=true");
  }

  async createSubtask(data: { parentId: string; title: string; description?: string }): Promise<Task> {
    return this.safeFetch<Task>("/api/tasks", {
      method: "POST",
      body: JSON.stringify({
        parent_id: data.parentId,
        title: data.title,
        description: data.description,
      }),
    });
  }

  async updateSubtaskStatus(taskId: string, status: string): Promise<Task> {
    const statusMap: Record<string, number> = {
      todo: 1,
      done: 2,
      cancelled: 3,
    };

    const statusId = statusMap[status];
    if (!statusId) {
      throw new Error(`Invalid status: ${status}. Available statuses: todo, done, cancelled.`);
    }

    return this.safeFetch<Task>(`/api/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify({ status_id: statusId }),
    });
  }

  async proposeTaskResolution(taskId: string, status: string, comment: string): Promise<Task> {
    const statusMap: Record<string, number> = {
      done: 2,
      cancelled: 3,
    };
    const statusId = statusMap[status];
    if (!statusId) {
      throw new Error(`Invalid status for proposal: ${status}. Available: done, cancelled.`);
    }

    return this.safeFetch<Task>(`/api/tasks/${taskId}/propose-status`, {
      method: "POST",
      body: JSON.stringify({ new_status_id: statusId, comment }),
    });
  }

  async reorderTasks(tasks: { id: string; order: number }[]): Promise<unknown> {
    return this.safeFetch<unknown>("/api/tasks/reorder", {
      method: "POST",
      body: JSON.stringify({ tasks }),
    });
  }
}
