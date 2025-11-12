import type { APIRoute } from "astro";
import { ZodError } from "zod";
import { DEFAULT_USER_ID, supabase } from "@/db/supabase.client";
import {
  AuthorizationError,
  InvalidStateError,
  TaskNotFoundError,
} from "@/lib/errors";
import { ReorderTasksDtoSchema } from "@/lib/schemas/task.schemas";
import { TaskService } from "@/lib/services/task.service";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const taskService = new TaskService(supabase);

  try {
    // 1. Validate request body
    const body = await request.json();
    const validatedData = ReorderTasksDtoSchema.parse(body);

    // TODO: Replace with actual user ID from auth context
    const userId = DEFAULT_USER_ID;

    // 2. Call service method
    await taskService.reorderTasks(userId, validatedData);

    // 3. Return success response
    return new Response(null, { status: 200 });
  } catch (error) {
    // 4. Handle errors
    if (error instanceof ZodError) {
      return new Response(
        JSON.stringify({
          message: "Invalid request body.",
          errors: error.flatten().fieldErrors,
        }),
        { status: 400 }
      );
    }
    if (error instanceof TaskNotFoundError) {
      return new Response(JSON.stringify({ message: error.message }), {
        status: 404,
      });
    }
    if (error instanceof AuthorizationError) {
      return new Response(JSON.stringify({ message: error.message }), {
        status: 403,
      });
    }
    if (error instanceof InvalidStateError) {
      return new Response(JSON.stringify({ message: error.message }), {
        status: 409, // Conflict, as the state of the resources is not as expected
      });
    }
    if (error instanceof Error) {
      console.error("Error reordering tasks:", error);
      return new Response(
        JSON.stringify({ message: "An unexpected error occurred." }),
        { status: 500 }
      );
    }

    // Fallback for non-Error objects
    console.error("An unexpected non-error was thrown:", error);
    return new Response(
      JSON.stringify({ message: "An unexpected error occurred." }),
      { status: 500 }
    );
  }
};
