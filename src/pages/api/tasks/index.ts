import type { APIRoute } from 'astro';
import { TaskCreateSchema } from '@/lib/schemas/task.schemas';
import { createTask } from '@/lib/services/task.service';
import type { TaskCreateCommand } from '@/types';
import { DEFAULT_USER_ID } from '@/db/supabase.client';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const { supabase } = locals;

  try {
    const body = await request.json();
    const validation = TaskCreateSchema.safeParse(body);

    if (!validation.success) {
      return new Response(
        JSON.stringify({
          message: 'Validation failed',
          errors: validation.error.flatten().fieldErrors,
        }),
        { status: 400 },
      );
    }

    const command: TaskCreateCommand = validation.data;

    // TODO: Replace with actual auth logic
    const auth = { userId: DEFAULT_USER_ID };

    const newTask = await createTask(supabase, command, auth);

    return new Response(JSON.stringify(newTask), { status: 201 });
  } catch (error) {
    const err = error as Error;
    console.error('Error creating task:', err.message);

    if (
      err.message.includes('not found') ||
      err.message.includes('does not belong to the specified project')
    ) {
      return new Response(JSON.stringify({ message: err.message }), { status: 404 });
    }

    if (err.message.includes('is required')) {
      return new Response(JSON.stringify({ message: err.message }), { status: 400 });
    }

    if (err.message.includes('AI can only create sub-tasks')) {
      return new Response(JSON.stringify({ message: err.message }), { status: 403 });
    }

    return new Response(JSON.stringify({ message: 'Internal Server Error' }), {
      status: 500,
    });
  }
};
