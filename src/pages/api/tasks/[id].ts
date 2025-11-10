import type { APIContext } from 'astro';
import { z } from 'zod';
import { taskService } from '@/lib/services/task.service';
import { DEFAULT_USER_ID, type SupabaseClient } from '@/db/supabase.client';
import { TaskUpdateSchema } from '@/lib/schemas/task.schemas';

export const prerender = false;

const taskIdSchema = z.string().uuid();

export async function GET({ params, locals }: APIContext) {
  const supabase = locals.supabase as SupabaseClient;
  const validation = taskIdSchema.safeParse(params.id);

  if (!validation.success) {
    return new Response(
      JSON.stringify({
        message: 'Invalid task ID format',
        errors: validation.error.flatten().fieldErrors,
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const taskId = validation.data;

  try {
    const task = await taskService.getTaskById({ taskId, supabase });

    if (!task) {
      return new Response(JSON.stringify({ message: 'Task not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(task), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function PATCH({ params, request, locals }: APIContext) {
  const supabase = locals.supabase as SupabaseClient;

  // 1. Validate Task ID
  const idValidation = taskIdSchema.safeParse(params.id);
  if (!idValidation.success) {
    return new Response(
      JSON.stringify({
        message: 'Invalid task ID format',
        errors: idValidation.error.flatten().fieldErrors,
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }
  const taskId = idValidation.data;

  // 2. Validate Request Body
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ message: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const bodyValidation = TaskUpdateSchema.safeParse(body);
  if (!bodyValidation.success) {
    return new Response(
      JSON.stringify({
        message: 'Invalid request body',
        errors: bodyValidation.error.flatten().fieldErrors,
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }
  const updateData = bodyValidation.data;

  try {
    // TODO: Replace with actual auth principal from context.locals
    const auth = { userId: DEFAULT_USER_ID };

    const updatedTask = await taskService.updateTask(supabase, taskId, updateData, auth);

    if (!updatedTask) {
      return new Response(JSON.stringify({ message: 'Task not found or access denied' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(updatedTask), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error updating task:', error);
    return new Response(JSON.stringify({ message: error.message || 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
