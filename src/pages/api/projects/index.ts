import type { APIRoute } from 'astro';
import { ProjectService } from '@/lib/services/project.service';
import { DEFAULT_USER_ID } from '@/db/supabase.client';
import { z } from 'zod';
import { ProjectCreateSchema } from '@/lib/schemas/project.schemas';
import type { ProjectCreateCommand } from '@/types';
import { ZodError } from 'zod';

export const prerender = false;

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
		const projectService = new ProjectService();
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
		projectData = ProjectCreateSchema.parse(body);
	} catch (error) {
		if (error instanceof ZodError) {
			return new Response(JSON.stringify({ error: 'Bad Request', details: error.flatten() }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		return new Response(JSON.stringify({ error: 'Bad Request', details: 'Malformed JSON' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	try {
		const projectService = new ProjectService();
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
