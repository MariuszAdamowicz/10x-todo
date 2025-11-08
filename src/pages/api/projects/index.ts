import type { APIRoute } from 'astro';
import { getProjectsForUser } from '@/lib/services/project.service';
import { DEFAULT_USER_ID } from '@/db/supabase.client';

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
		const projects = await getProjectsForUser(supabase, userId);
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
