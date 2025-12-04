import type { APIContext } from "astro";
import { z } from "zod";
import { taskRejectProposalSchema } from "@/lib/schemas/task.schemas";
import { TaskService } from "@/lib/services/task.service";
import { handleApiError } from "@/lib/errors";
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
    return handleApiError(error);
  }
};
