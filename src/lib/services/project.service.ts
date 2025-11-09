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
}

export const projectService = new ProjectService();
