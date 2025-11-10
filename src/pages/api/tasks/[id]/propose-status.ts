import type { APIContext } from 'astro';
import { taskProposeStatusSchema } from '@/lib/schemas/task.schemas';
import { ZodError } from 'zod';
import { taskService } from '@/lib/services/task.service';
import type { SupabaseClient } from '@/db/supabase.client';

export const prerender = false;

export async function POST({ params, request, locals }: APIContext): Promise<Response> {
	const { id: taskId } = params;
	const { supabase, user } = locals;
	const { projectId: aiProjectId } = user || {};

	if (!taskId) {
		return new Response(JSON.stringify({ message: 'Task ID is required.' }), { status: 400 });
	}

	// This endpoint is for AI only, authenticated via API key
	if (!aiProjectId) {
		return new Response(JSON.stringify({ message: 'Unauthorized: Project ID is missing.' }), {
			status: 401,
		});
	}

	try {
		const body = await request.json();
		const command = taskProposeStatusSchema.parse(body);

		const updatedTask = await taskService.proposeTaskStatus(
			supabase as SupabaseClient,
			taskId,
			command,
			{ aiProjectId },
		);

		return new Response(JSON.stringify(updatedTask), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		if (error instanceof ZodError) {
			return new Response(JSON.stringify({ message: 'Invalid input.', errors: error.errors }), {
				status: 400,
			});
		}
		if (error instanceof Error) {
			if (error.message.includes('JSON')) {
				return new Response(JSON.stringify({ message: 'Invalid JSON body.' }), { status: 400 });
			}
			if (error.message.includes('not found or AI does not have access')) {
				return new Response(JSON.stringify({ message: error.message }), { status: 404 });
			}
			if (
				error.message.includes('delegated tasks') ||
				error.message.includes('Invalid status transition')
			) {
				return new Response(JSON.stringify({ message: error.message }), { status: 403 });
			}
		}
		console.error(error);
		return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
	}
}
