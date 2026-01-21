/* eslint-disable no-console */
import type { APIRoute } from "astro";
import { ReorderTasksDtoSchema } from "@/lib/schemas/task.schemas";
import { TaskService } from "@/lib/services/task.service";
import { AuthorizationError, InvalidStateError, TaskNotFoundError } from "@/lib/errors";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const { user, aiProjectId, supabase } = locals;
  
  // Basic auth check - middleware ensures 'user' is present if logged in or API key is valid
  if (!user) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
  }

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
    
    // 2. Initialize Service with the client provided by middleware (handles both Session and API Key contexts)
    const taskService = new TaskService(supabase);

    // 3. Call the service to reorder tasks
    await taskService.reorderTasks(validatedBody, { userId: user.id, aiProjectId });

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
