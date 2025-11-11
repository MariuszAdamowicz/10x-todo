// src/lib/errors.ts

/**
 * Base class for custom application errors.
 */
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Thrown when a requested task is not found.
 * Maps to HTTP 404 Not Found.
 */
export class TaskNotFoundError extends AppError {
  constructor(message = "Task not found.") {
    super(message);
  }
}

/**
 * Thrown when a requested project is not found.
 * Maps to HTTP 404 Not Found.
 */
export class ProjectNotFoundError extends AppError {
  constructor(message = "Project not found.") {
    super(message);
  }
}

/**
 * Thrown when a user is not authorized to perform an action.
 * Maps to HTTP 403 Forbidden.
 */
export class AuthorizationError extends AppError {
  constructor(message = "You are not authorized to perform this action.") {
    super(message);
  }
}

/**
 * Thrown when an action cannot be performed due to the current state of the resource.
 * Maps to HTTP 409 Conflict.
 */
export class InvalidStateError extends AppError {
  constructor(message = "The action cannot be performed in the current state.") {
    super(message);
  }
}
