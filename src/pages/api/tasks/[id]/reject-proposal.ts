/* eslint-disable no-console */
import type { APIContext } from "astro";
import { z } from "zod";
import { taskRejectProposalSchema } from "@/lib/schemas/task.schemas";
import { TaskService } from "@/lib/services/task.service";
import { AuthorizationError, InvalidStateError, TaskNotFoundError } from "@/lib/errors";
import { createSupabaseServer } from "@/db/supabase.client";

export const prerender = false;

export const POST = async ({ params, request, locals, cookies }: APIContext) => {
  const { user } = locals;
  if (!user) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
  }

  try {
    const taskId = z.string().uuid().parse(params.id);
    const body = await request.json();
    const { comment } = taskRejectProposalSchema.parse(body);

    const supabase = createSupabaseServer({ cookies, headers: request.headers });
    const taskService = new TaskService(supabase);
    const updatedTask = await taskService.rejectProposal(taskId, user.id, comment);

    return new Response(JSON.stringify(updatedTask));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ message: "Validation failed", errors: error.errors }), { status: 400 });
    }
    if (error instanceof TaskNotFoundError) {
      return new Response(JSON.stringify({ message: error.message }), { status: 404 });
    }
    if (error instanceof AuthorizationError) {
      return new Response(JSON.stringify({ message: error.message }), { status: 403 });
    }
    if (error instanceof InvalidStateError) {
      return new Response(JSON.stringify({ message: error.message }), { status: 409 });
    }
    console.error("Error rejecting task proposal:", error);
    return new Response(JSON.stringify({ message: "Internal Server Error" }), { status: 500 });
  }
};
