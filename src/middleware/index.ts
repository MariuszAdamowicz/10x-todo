import { defineMiddleware } from 'astro:middleware';
import { supabaseClient, type SupabaseClient } from '@/db/supabase.client';

async function getProjectByApiKey(supabase: SupabaseClient, apiKey: string) {
	const { data, error } = await supabase
		.from('projects')
		.select('id')
		.eq('api_key', apiKey)
		.single();

	if (error) {
		// Log the error but don't expose details to the client.
		// A missing project for an API key is an auth failure, not a server error.
		console.error('Error fetching project by API key:', error.message);
		return null;
	}
	return data;
}

export const onRequest = defineMiddleware(async (context, next) => {
	context.locals.supabase = supabaseClient;
	context.locals.user = null; // Initialize user as null

	const apiKey = context.request.headers.get('X-API-Key');

	// Temporary auth handling for AI Assistant requests.
	// This is a minimal implementation to allow API testing and will be expanded later.
	if (apiKey) {
		try {
			const project = await getProjectByApiKey(supabaseClient, apiKey);
			if (project) {
				// For AI requests, we set the project ID in a way services can understand it.
				context.locals.user = { projectId: project.id };
			} else {
				// Invalid API Key
				return new Response(JSON.stringify({ message: 'Unauthorized: Invalid API Key' }), {
					status: 401,
					headers: { 'Content-Type': 'application/json' },
				});
			}
		} catch (e) {
			console.error('Middleware error:', e);
			return new Response(JSON.stringify({ message: 'Internal Server Error' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
		}
	}
	// TODO: Handle standard user session authentication (JWT) here in an `else` block.

	return next();
});
