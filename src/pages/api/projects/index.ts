import type { APIRoute } from 'astro';
import { getProjectsForUser } from '@/lib/services/project.service';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
	const { supabase, user } = locals;

	// TODO: Re-enable authentication before production. This is temporarily disabled for development
	// to allow testing the endpoint without a valid user session.
	/*
	if (!user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	*/

	try {
		const projects = await getProjectsForUser(supabase);
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
