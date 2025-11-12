import type { APIRoute } from "astro";
import { ReorderTasksDtoSchema } from "@/lib/schemas/task.schemas";
import { TaskService } from "@/lib/services/task.service";
import { DEFAULT_USER_ID } from "@/db/supabase.client";
import {
  AuthorizationError,
  InvalidStateError,
  TaskNotFoundError,
} from "@/lib/errors";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const { supabase } = locals;

  try {
    // 1. Parse and validate the request body
    const body = await request.json();
    const validation = ReorderTasksDtoSchema.safeParse(body);

    if (!validation.success) {
      return new Response(
        JSON.stringify({
          message: "Validation failed",
          errors: validation.error.flatten().fieldErrors,
        }),
        { status: 400 }
      );
    }
    
    const validatedBody = validation.data;

    // 2. Get user ID (using default for now)
    const userId = DEFAULT_USER_ID;

    // 3. Call the service to reorder tasks
    const taskService = new TaskService(supabase);
    await taskService.reorderTasks(userId, validatedBody);

    return new Response(null, { status: 204 });

  } catch (error) {
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
        status: 409,
      });
    }

    console.error("Error reordering tasks:", error);
    return new Response(JSON.stringify({ message: "Internal Server Error" }), {
      status: 500,
    });
  }
};
