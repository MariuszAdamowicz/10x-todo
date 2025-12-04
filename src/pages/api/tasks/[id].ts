import type { APIContext } from "astro";
import { z } from "zod";
import { TaskService } from "@/lib/services/task.service";
import { createSupabaseServer } from "@/db/supabase.client";
import { TaskUpdateSchema } from "@/lib/schemas/task.schemas";
import { AuthorizationError, TaskNotFoundError } from "@/lib/errors";

export const prerender = false;

const taskIdSchema = z.string().uuid();

export async function GET({ params, locals, cookies, request }: APIContext) {
  const { user } = locals;
  if (!user) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
  }

  const validation = taskIdSchema.safeParse(params.id);

  if (!validation.success) {
    return new Response(
      JSON.stringify({
        message: "Invalid task ID format",
        errors: validation.error.flatten().fieldErrors,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const taskId = validation.data;
  const supabase = createSupabaseServer({ cookies, headers: request.headers });

  try {
    const taskService = new TaskService(supabase);
    const task = await taskService.getTaskById({ taskId, userId: user.id });

    return new Response(JSON.stringify(task), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof TaskNotFoundError) {
      return new Response(JSON.stringify({ message: error.message }), {
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
    console.error("Error fetching task:", error);
    return new Response(JSON.stringify({ message: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function PATCH({ params, request, locals, cookies }: APIContext) {
  const { user } = locals;
  if (!user) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
  }

  // 1. Validate Task ID
  const idValidation = taskIdSchema.safeParse(params.id);
  if (!idValidation.success) {
    return new Response(
      JSON.stringify({
        message: "Invalid task ID format",
        errors: idValidation.error.flatten().fieldErrors,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  const taskId = idValidation.data;

  // 2. Validate Request Body
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ message: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const bodyValidation = TaskUpdateSchema.safeParse(body);
  if (!bodyValidation.success) {
    return new Response(
      JSON.stringify({
        message: "Invalid request body",
        errors: bodyValidation.error.flatten().fieldErrors,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  const updateData = bodyValidation.data;

  const supabase = createSupabaseServer({ cookies, headers: request.headers });

  try {
    const auth = { userId: user.id };
    const taskService = new TaskService(supabase);
    const updatedTask = await taskService.updateTask(taskId, updateData, auth);

    return new Response(JSON.stringify(updatedTask), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    if (error instanceof TaskNotFoundError) {
      return new Response(JSON.stringify({ message: error.message }), {
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
    console.error("Error updating task:", error);
    return new Response(JSON.stringify({ message: error.message || "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
