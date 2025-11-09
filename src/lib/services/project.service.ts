import type { SupabaseClient } from '@/db/supabase.client';
import type {
	ProjectCreateCommand,
	ProjectCreateResultDto,
	ProjectGetDetailsDto,
	ProjectGetDto,
	ProjectUpdateCommand,
	ProjectUpdateResultDto,
} from '@/types';

class ProjectService {
	/**
	 * Fetches a list of projects for a specific user.
	 *
	 * @param supabase - The Supabase client instance.
	 * @param userId - The ID of the user whose projects are to be fetched.
	 * @returns A promise that resolves to an array of projects.
	 * @throws An error if the database query fails.
	 */
	public async getProjects(
		supabase: SupabaseClient,
		userId: string,
	): Promise<ProjectGetDto[]> {
		const { data: projects, error } = await supabase
			.from('projects')
			.select('id, name, description, created_at')
			.eq('user_id', userId)
			.order('created_at', { ascending: false });

		if (error) {
			// In a real application, you might want to log this error.
			console.error('Error fetching projects:', error);
			throw new Error('Failed to fetch projects from the database.');
		}

		return projects;
	}

	/**
	 * Fetches a single project by its ID for a specific user.
	 *
	 * @param supabase The Supabase client instance.
	 * @param id The ID of the project to fetch.
	 * @param userId The ID of the user.
	 * @returns A promise that resolves to the project details or null if not found.
	 */
	public async getProjectById(
		supabase: SupabaseClient,
		id: string,
		userId: string,
	): Promise<ProjectGetDetailsDto | null> {
		const { data, error } = await supabase
			.from('projects')
			.select('id, name, description, api_key, created_at')
			.eq('id', id)
			.eq('user_id', userId)
			.single();

		if (error) {
			console.error('Error fetching project by ID:', error);
			return null;
		}

		return data;
	}

	/**
	 * Creates a new project for a specific user.
	 *
	 * @param supabase The Supabase client instance.
	 * @param userId The ID of the user creating the project.
	 * @param projectData The data for the new project.
	 * @returns A promise that resolves to the newly created project.
	 * @throws An error if the database query fails.
	 */
	public async createProject(
		supabase: SupabaseClient,
		userId: string,
		projectData: ProjectCreateCommand,
	): Promise<ProjectCreateResultDto> {
		const { data, error } = await supabase
			.from('projects')
			.insert({
				user_id: userId,
				name: projectData.name,
				description: projectData.description,
			})
			.select()
			.single();

		if (error) {
			console.error('Error creating project:', error);
			throw new Error('Failed to create project in the database.');
		}

		return data;
	}

	/**
	 * Updates an existing project for a specific user.
	 *
	 * @param supabase The Supabase client instance.
	 * @param id The ID of the project to update.
	 * @param userId The ID of the user updating the project.
	 * @param projectData The new data for the project.
	 * @returns A promise that resolves to the updated project or null if not found or permission is denied.
	 */
	public async updateProject(
		supabase: SupabaseClient,
		id: string,
		userId: string,
		projectData: ProjectUpdateCommand,
	): Promise<ProjectUpdateResultDto | null> {
		const { data, error } = await supabase
			.from('projects')
			.update({
				name: projectData.name,
				description: projectData.description,
			})
			.eq('id', id)
			.eq('user_id', userId)
			.select()
			.single();

		if (error) {
			console.error('Error updating project:', error);
			// The error might indicate that the row was not found, which we treat as a "not found" case.
			// Or it could be a genuine database error. For now, we return null and let the caller handle it.
			return null;
		}

		return data;
	}

	/**
	 * Deletes a project for a specific user.
	 *
	 * @param supabase The Supabase client instance.
	 * @param id The ID of the project to delete.
	 * @param userId The ID of the user deleting the project.
	 * @returns A promise that resolves to an object indicating the operation's status.
	 */
	public async deleteProject(
		supabase: SupabaseClient,
		id: string,
		userId: string,
	): Promise<{ status: 'success' | 'not_found' | 'error'; error?: Error }> {
		const { error, count } = await supabase
			.from('projects')
			.delete({ count: 'exact' })
			.eq('id', id)
			.eq('user_id', userId);

		if (error) {
			console.error('Error deleting project:', error);
			return { status: 'error', error: new Error('Failed to delete project.') };
		}

		if (count === 0) {
			return { status: 'not_found' };
		}

		return { status: 'success' };
	}

	/**
	 * Regenerates the API key for a specific project.
	 *
	 * @param projectId The ID of the project.
	 * @param userId The ID of the user.
	param supabase The Supabase client instance.
	 * @returns A promise that resolves to an object containing the new API key.
	 * @throws An error if the project is not found or the user is not the owner.
	 */
	public async regenerateApiKey(
		projectId: string,
		userId: string,
		supabase: SupabaseClient,
	): Promise<{ api_key: string }> {
		// First, verify the user owns the project
		const { data: project, error: fetchError } = await supabase
			.from('projects')
			.select('id, user_id')
			.eq('id', projectId)
			.single();

		if (fetchError || !project) {
			throw new Error('Project not found');
		}

		if (project.user_id !== userId) {
			throw new Error('Forbidden');
		}

		// Generate a new API key and update the project
		const { data: updatedProject, error: updateError } = await supabase
			.from('projects')
			.update({ api_key: crypto.randomUUID() })
			.eq('id', projectId)
			.eq('user_id', userId)
			.select('api_key')
			.single();

		if (updateError || !updatedProject) {
			throw new Error('Failed to regenerate API key.');
		}

		return updatedProject;
	}
}

export const projectService = new ProjectService();
