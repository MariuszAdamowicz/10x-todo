import type { APIContext } from 'astro';
import { z } from 'zod';
import { taskService } from '@/lib/services/task.service';
import type { SupabaseClient } from '@/db/supabase.client';

export const prerender = false;

const taskIdSchema = z.string().uuid();

export async function GET({ params, context }: APIContext) {
	const supabase = context.locals.supabase as SupabaseClient;
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
