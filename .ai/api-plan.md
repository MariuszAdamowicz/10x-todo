# REST API Plan

This document outlines the REST API for the 10x To-Do App, designed for interaction between human developers and AI assistants.

## 1. Resources

-   **Projects**: Represents a user's project, which is a container for tasks. Maps to the `public.projects` table.
-   **Tasks**: Represents a single task or sub-task within a project. Maps to the `public.tasks` table.
-   **Task Comments**: Represents comments on tasks, also used for logging status changes. Maps to the `public.task_comments` table.
-   **Task Statuses**: A read-only resource for task status definitions. Maps to the `public.task_statuses` table.

## 2. Endpoints

All endpoints are prefixed with `/api`. Authentication is required for all endpoints. User endpoints require a user session, while AI endpoints require an `X-API-Key` header.

---

### 2.1. Projects

#### **`GET /projects`**

-   **Description**: Get all projects for the authenticated user.
-   **Success Response (200 OK)**:
    ```json
    [
      {
        "id": "uuid",
        "name": "string",
        "description": "string | null",
        "created_at": "timestamptz"
      }
    ]
    ```
-   **Error Responses**:
    -   `401 Unauthorized`: User is not authenticated.

#### **`POST /projects`**

-   **Description**: Create a new project for the authenticated user. An API key is generated automatically.
-   **Request Body**:
    ```json
    {
      "name": "string",
      "description": "string | null"
    }
    ```
-   **Success Response (201 Created)**:
    ```json
    {
      "id": "uuid",
      "user_id": "uuid",
      "name": "string",
      "description": "string | null",
      "api_key": "uuid",
      "created_at": "timestamptz"
    }
    ```
-   **Error Responses**:
    -   `400 Bad Request`: `name` is missing or invalid.
    -   `401 Unauthorized`: User is not authenticated.

#### **`GET /projects/{id}`**

-   **Description**: Get details of a specific project, including the API key.
-   **Success Response (200 OK)**:
    ```json
    {
      "id": "uuid",
      "name": "string",
      "description": "string | null",
      "api_key": "uuid",
      "created_at": "timestamptz"
    }
    ```
-   **Error Responses**:
    -   `401 Unauthorized`: User is not authenticated.
    -   `403 Forbidden`: User does not own this project.
    -   `404 Not Found`: Project not found.

#### **`PUT /projects/{id}`**

-   **Description**: Update a project's name or description.
-   **Request Body**:
    ```json
    {
      "name": "string",
      "description": "string | null"
    }
    ```
-   **Success Response (200 OK)**:
    ```json
    {
      "id": "uuid",
      "name": "string",
      "description": "string | null",
      /* ... other fields ... */
    }
    ```
-   **Error Responses**:
    -   `400 Bad Request`: `name` is missing or invalid.
    -   `401 Unauthorized`: User is not authenticated.
    -   `403 Forbidden`: User does not own this project.
    -   `404 Not Found`: Project not found.

#### **`DELETE /projects/{id}`**

-   **Description**: Delete a project and all its associated tasks.
-   **Success Response (204 No Content)**:
-   **Error Responses**:
    -   `401 Unauthorized`: User is not authenticated.
    -   `403 Forbidden`: User does not own this project.
    -   `404 Not Found`: Project not found.

#### **`POST /projects/{id}/regenerate-api-key`**

-   **Description**: Invalidate the old API key and generate a new one for the project.
-   **Success Response (200 OK)**:
    ```json
    {
      "api_key": "new_uuid_string"
    }
    ```
-   **Error Responses**:
    -   `401 Unauthorized`: User is not authenticated.
    -   `403 Forbidden`: User does not own this project.
    -   `404 Not Found`: Project not found.

---

### 2.2. Tasks

#### **`GET /tasks`**

-   **Description**: Get all tasks for a project. Can be filtered by parent task or delegation status. Intended for both User and AI. The project is identified by the user's session or the AI's API key.
-   **Query Parameters**:
    -   `parent_id` (uuid, optional): Filters tasks to get children of a specific parent task. If not provided, returns top-level tasks.
    -   `delegated` (boolean, optional, AI-only): If `true`, returns only tasks delegated to the AI.
-   **Success Response (200 OK)**:
    ```json
    [
      {
        "id": "uuid",
        "project_id": "uuid",
        "parent_id": "uuid | null",
        "status_id": "smallint",
        "title": "string",
        "description": "string | null",
        "position": "integer",
        "is_delegated": "boolean",
        "created_by_ai": "boolean",
        "created_at": "timestamptz",
        "updated_at": "timestamptz"
      }
    ]
    ```
-   **Error Responses**:
    -   `401 Unauthorized`: Invalid or missing credentials (session or API key).

#### **`POST /tasks`**

-   **Description**: Create a new task or sub-task. The project is identified by the user's session or the AI's API key.
-   **Request Body**:
    ```json
    {
      "project_id": "uuid", // Required for user, inferred from API key for AI
      "parent_id": "uuid | null",
      "title": "string",
      "description": "string | null"
    }
    ```
-   **Success Response (201 Created)**: Returns the newly created task object.
-   **Error Responses**:
    -   `400 Bad Request`: `title` or `project_id` is missing.
    -   `401 Unauthorized`: Invalid credentials.
    -   `403 Forbidden`: (AI) Attempting to create a sub-task under a non-delegated task or at a depth > 1.

#### **`GET /tasks/{id}`**

-   **Description**: Get a single task by its ID.
-   **Success Response (200 OK)**: Returns the task object.
-   **Error Responses**:
    -   `401 Unauthorized`: Invalid credentials.
    -   `403 Forbidden`: Task is not in a project accessible by the user/AI.
    -   `404 Not Found`: Task not found.

#### **`PATCH /tasks/{id}`**

-   **Description**: Update a task's details (title, description, status, delegation).
-   **Request Body**:
    ```json
    {
      "title": "string", // optional
      "description": "string | null", // optional
      "status_id": "smallint", // optional
      "is_delegated": "boolean" // optional, user only
    }
    ```
-   **Success Response (200 OK)**: Returns the updated task object.
-   **Error Responses**:
    -   `401 Unauthorized`: Invalid credentials.
    -   `403 Forbidden`: (AI) Attempting to modify a task it doesn't own or a delegated task directly (must use proposal flow).
    -   `404 Not Found`: Task not found.

#### **`POST /tasks/{id}/propose-status` (AI Only)**

-   **Description**: AI proposes a status change for a delegated task. This sets the status to a "pending" state and requires a comment.
-   **Request Body**:
    ```json
    {
      "new_status_id": "smallint", // ID for "Done" or "Canceled"
      "comment": "string"
    }
    ```
-   **Success Response (200 OK)**: Returns the updated task object with the "pending" status.
-   **Error Responses**:
    -   `400 Bad Request`: `comment` is empty or `new_status_id` is invalid.
    -   `401 Unauthorized`: Invalid API key.
    -   `403 Forbidden`: Task is not delegated to the AI.
    -   `404 Not Found`: Task not found.

#### **`POST /tasks/{id}/accept-proposal` (User Only)**

-   **Description**: User accepts an AI's proposal, changing the task status to its final state (e.g., "Done" or "Canceled").
-   **Success Response (200 OK)**: Returns the updated task object.
-   **Error Responses**:
    -   `401 Unauthorized`: User not authenticated.
    -   `403 Forbidden`: User does not own the project.
    -   `404 Not Found`: Task not found.
    -   `409 Conflict`: Task is not in a "pending" state.

#### **`POST /tasks/{id}/reject-proposal` (User Only)**

-   **Description**: User rejects an AI's proposal, reverting the task status to "To Do" and adding a comment.
-   **Request Body**:
    ```json
    {
      "comment": "string"
    }
    ```
-   **Success Response (200 OK)**: Returns the updated task object.
-   **Error Responses**:
    -   `400 Bad Request`: `comment` is empty.
    -   `401 Unauthorized`: User not authenticated.
    -   `403 Forbidden`: User does not own the project.
    -   `404 Not Found`: Task not found.
    -   `409 Conflict`: Task is not in a "pending" state.

#### **`POST /tasks/reorder`**

-   **Description**: Reorders a list of tasks under the same parent. Used by both User and AI, with different authorization logic.
-   **Request Body**:
    ```json
    {
      "parent_id": "uuid | null", // The parent of the tasks being reordered
      "task_ids": ["uuid", "uuid", "uuid"] // Array of task IDs in the new desired order
    }
    ```
-   **Success Response (204 No Content)**:
-   **Error Responses**:
    -   `400 Bad Request`: `task_ids` is empty or contains duplicates.
    -   `401 Unauthorized`: Invalid credentials.
    -   `403 Forbidden`: Attempting to reorder tasks not owned or managed by the principal.

---

### 2.3. Task Statuses

#### **`GET /task-statuses`**

-   **Description**: Get the list of all possible task statuses. This is a public, read-only endpoint for authenticated principals.
-   **Success Response (200 OK)**:
    ```json
    [
      {
        "id": 1,
        "name": "To Do"
      },
      {
        "id": 2,
        "name": "Done"
      },
      // ... etc.
    ]
    ```

---

## 3. Authentication and Authorization

**Note on Current Implementation:** The middleware currently has a temporary, minimal implementation that only handles `X-API-Key` authentication for AI assistants to facilitate testing. Full user authentication via JWT is not yet implemented.

-   **User Authentication**: Handled by Supabase Auth. A valid JWT must be sent in the `Authorization` header for user-facing endpoints. RLS policies for the `authenticated` role will enforce ownership.
-   **AI Authentication**: The AI assistant must include the project-specific API key in the `X-API-Key` HTTP header of every request.
-   **Authorization Logic**: A custom middleware in Astro will inspect the request.
    -   If an `Authorization` header is present, it will use the Supabase client to verify the user's session.
    -   If an `X-API-Key` header is present, it will look up the corresponding `project_id` from the database.
    -   The `project_id` or `user_id` will be passed to subsequent database queries and RLS policies to ensure the principal can only access permitted resources.

## 4. Validation and Business Logic

-   **Input Validation**: All API endpoints will use `zod` to validate incoming request bodies and query parameters against the defined schemas.
-   **Business Logic Implementation**:
    -   **AI Sub-task Creation**: The `POST /tasks` endpoint will check if `parent_id` refers to a task that has `is_delegated=true` and belongs to the correct project (identified by the API key).
    -   **Proposal Flow**: The `/propose-status`, `/accept-proposal`, and `/reject-proposal` endpoints encapsulate the state machine for task completion, ensuring tasks move between `To Do` -> `...pending...` -> `Done`/`Canceled` states correctly.
    -   **Comments on Proposals**: The `/propose-status` and `/reject-proposal` endpoints will automatically create an entry in the `task_comments` table to log the action and the reason.
    -   **Task Reordering**: The `POST /tasks/reorder` endpoint will update the `position` field of multiple tasks within a single database transaction to ensure atomicity.
