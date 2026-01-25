import { config } from "./config.js";

export class ApiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
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
            const errorBody = await response.json() as any;
             if (errorBody && errorBody.message) {
                errorMessage += ` - ${errorBody.message}`;
            }
        } catch (e) {
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

      return await response.json() as T;
    } catch (error: any) {
        // Network errors or other fetch issues
        throw new Error(`API Request Failed: ${error.message}`);
    }
  }

  async getTaskHierarchy(): Promise<any> {
    return this.safeFetch("/api/tasks");
  }

  async listDelegatedTasks(): Promise<any> {
    return this.safeFetch("/api/tasks?delegated=true");
  }

  async createSubtask(data: { parentId: string; title: string; description?: string }): Promise<any> {
      return this.safeFetch("/api/tasks", {
          method: "POST",
          body: JSON.stringify({
              parent_id: data.parentId,
              title: data.title,
              description: data.description
          })
      });
  }

  async updateSubtaskStatus(taskId: string, status: string): Promise<any> {
       const statusMap: Record<string, number> = {
           'todo': 1,
           'done': 2,
           'cancelled': 3
       };
       
       const statusId = statusMap[status];
       if (!statusId) {
           throw new Error(`Invalid status: ${status}. Available statuses: todo, done, cancelled.`);
       }

       return this.safeFetch(`/api/tasks/${taskId}`, {
           method: "PATCH",
           body: JSON.stringify({ status_id: statusId })
       });
  }

  async proposeTaskResolution(taskId: string, status: string, comment: string): Promise<any> {
       const statusMap: Record<string, number> = {
           'done': 2,
           'cancelled': 3
       };
        const statusId = statusMap[status];
       if (!statusId) {
           throw new Error(`Invalid status for proposal: ${status}. Available: done, cancelled.`);
       }

      return this.safeFetch(`/api/tasks/${taskId}/propose-status`, {
          method: "POST",
          body: JSON.stringify({ new_status_id: statusId, comment })
      });
  }

  async reorderTasks(tasks: { id: string; order: number }[]): Promise<any> {
      return this.safeFetch("/api/tasks/reorder", {
          method: "POST",
          body: JSON.stringify({ tasks })
      });
  }
}

export const apiClient = new ApiClient();
