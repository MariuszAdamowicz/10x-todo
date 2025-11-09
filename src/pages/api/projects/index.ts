import type { APIRoute } from 'astro';
import { projectService } from '@/lib/services/project.service';
import { DEFAULT_USER_ID } from '@/db/supabase.client';
import { z } from 'zod';
import type { ProjectCreateCommand } from '@/types';

export const prerender = false;

const projectCreateSchema = z.object({
	name: z.string().min(1),
	description: z.string().nullable(),
});

export const GET: APIRoute = async ({ locals }) => {
	const { supabase } = locals;
	const userId = locals.user?.id || DEFAULT_USER_ID;

	if (!userId) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	try {
		const projects = await projectService.getProjects(supabase, userId);
		return new Response(JSON.stringify(projects), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		console.error('Error in GET /api/projects:', error);
		return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

export const POST: APIRoute = async ({ request, locals }) => {
	const { supabase } = locals;
	const userId = locals.user?.id || DEFAULT_USER_ID;

	if (!userId) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	let projectData: ProjectCreateCommand;
	try {
		const body = await request.json();
		projectData = projectCreateSchema.parse(body);
	} catch (error) {
		return new Response(JSON.stringify({ error: 'Bad Request', details: error }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	try {
		const newProject = await projectService.createProject(supabase, userId, projectData);
		return new Response(JSON.stringify(newProject), {
			status: 201,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		console.error('Error in POST /api/projects:', error);
		return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};
