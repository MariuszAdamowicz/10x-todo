import type { SupabaseClient } from '@/db/supabase.client';
import type { ProjectGetDto } from '@/types';
import { DEFAULT_USER_ID } from '@/db/supabase.client';

/**
 * Fetches a list of projects for a specific user.
 *
 * @param supabase - The Supabase client instance.
 * @param userId - The ID of the user whose projects are to be fetched.
 * @returns A promise that resolves to an array of projects.
 * @throws An error if the database query fails.
 */
export async function getProjectsForUser(supabase: SupabaseClient): Promise<ProjectGetDto[]> {
	const { data: projects, error } = await supabase
		.from('projects')
		.select('id, name, description, created_at')
		.eq('user_id', DEFAULT_USER_ID)
		.order('created_at', { ascending: false });

	if (error) {
		// In a real application, you might want to log this error.
		console.error('Error fetching projects:', error);
		throw new Error('Failed to fetch projects from the database.');
	}

	return projects;
}
