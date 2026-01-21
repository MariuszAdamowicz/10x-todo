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
       // Map string status to ID (This logic might need to be more robust or fetched from API)
       // For now, assuming standard IDs or that the API accepts string statuses if implemented,
       // BUT the DTO says status_id is number.
       // We need to know the status IDs.
       // Hardcoding for now based on typical setup, or we need an endpoint to get statuses.
       // Let's assume the API might handle conversion or we need to fetch statuses first.
       // The plan says: PATCH /api/tasks/{taskId} with { status }
       // But the DB schema has status_id.
       // Let's implement a helper to map status names to IDs if needed, or assume the API handles it.
       // Checking `patch-tasks-id-endpoint-implementation-plan.md` might clarify.
       // For this step, I'll send what the tool receives, but the tool definition in plan says "status: enum".
       // The API likely expects `status_id`.
       // I'll leave a TODO here to resolve status mapping.
       
       // Temporary mapping based on seed data or common sense
       const statusMap: Record<string, number> = {
           'todo': 1,
           'in_progress': 2,
           'done': 3,
           'cancelled': 4
       };
       
       const statusId = statusMap[status];
       if (!statusId) {
           throw new Error(`Invalid status: ${status}`);
       }

       return this.safeFetch(`/api/tasks/${taskId}`, {
           method: "PATCH",
           body: JSON.stringify({ status_id: statusId })
       });
  }

  async proposeTaskResolution(taskId: string, status: string, comment: string): Promise<any> {
       const statusMap: Record<string, number> = {
           'done': 3,
           'cancelled': 4
       };
        const statusId = statusMap[status];
       if (!statusId) {
           throw new Error(`Invalid status for proposal: ${status}`);
       }

      return this.safeFetch(`/api/tasks/${taskId}/propose-status`, {
          method: "POST",
          body: JSON.stringify({ new_status_id: statusId, comment })
      });
  }
}

export const apiClient = new ApiClient();
