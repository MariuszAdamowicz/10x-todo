/* eslint-disable no-console */
import type { APIRoute } from "astro";
import { z } from "zod";
import { createSupabaseServer } from "@/db/supabase.client";
import { TaskService } from "@/lib/services/task.service";
import { TaskNotFoundError, AuthorizationError, InvalidStateError } from "@/lib/errors";

export const prerender = false;

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export const POST: APIRoute = async (context) => {
  const { params, locals, cookies, request } = context;

  const { user } = locals;
  if (!user) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
  }

  const safeParams = paramsSchema.safeParse(params);

  if (!safeParams.success) {
    return new Response(
      JSON.stringify({
        error: "Invalid task ID format.",
        details: safeParams.error.flatten(),
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const taskId = safeParams.data.id;
  const supabase = createSupabaseServer({ cookies, headers: request.headers });

  try {
    const taskService = new TaskService(supabase);
    const updatedTask = await taskService.acceptStatusProposal(taskId, user.id);

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
      return new Response(JSON.stringify({ message: error.message }), {
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
    return new Response(JSON.stringify({ error: "An unexpected error occurred." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
