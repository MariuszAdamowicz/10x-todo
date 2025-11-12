import type { APIRoute } from "astro";
import { DEFAULT_USER_ID } from "@/db/supabase.client";
import { TaskService } from "@/lib/services/task.service";
import {
  TaskNotFoundError,
  AuthorizationError,
  InvalidStateError,
} from "@/lib/errors";
import { TaskIdSchema } from "@/lib/schemas/task.schemas";

export const POST: APIRoute = async (context) => {
  const { params, locals } = context;
  const supabase = locals.supabase;

  const safeParams = TaskIdSchema.safeParse(params.id);

  if (!safeParams.success) {
    return new Response(
      JSON.stringify({
        error: "Invalid task ID format.",
        details: safeParams.error.flatten(),
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const taskId = safeParams.data;
  // Na razie używamy statycznego ID użytkownika, zgodnie z wymaganiami
  const userId = DEFAULT_USER_ID;

  try {
    const taskService = new TaskService(supabase);
    const updatedTask = await taskService.acceptStatusProposal(taskId, userId);

    return new Response(JSON.stringify(updatedTask), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof TaskNotFoundError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (error instanceof AuthorizationError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (error instanceof InvalidStateError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.error("Error in accept-proposal endpoint:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
