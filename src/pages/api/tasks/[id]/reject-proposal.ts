import type { APIContext } from 'astro';
import { z } from 'zod';
import { taskRejectProposalSchema } from '@/lib/schemas/task.schemas';
import { TaskService } from '@/lib/services/task.service';
import { handleApiError } from '@/lib/errors';
import { DEFAULT_USER_ID } from '@/db/supabase.client';

export const POST = async ({ params, request, locals }: APIContext) => {
  try {
    const taskId = z.string().uuid().parse(params.id);
    const body = await request.json();
    const { comment } = taskRejectProposalSchema.parse(body);

    // TODO: Replace with actual user ID from session
    const userId = DEFAULT_USER_ID;

    const taskService = new TaskService(locals.supabase);
    const updatedTask = await taskService.rejectProposal(taskId, userId, comment);

    return new Response(JSON.stringify(updatedTask));
  } catch (error) {
    return handleApiError(error);
  }
};