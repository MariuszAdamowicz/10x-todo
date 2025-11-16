import { useState, useEffect } from 'react';
import type { ProjectViewModel, ProjectCreateCommand } from '@/types';
import { ProjectService } from '@/lib/services/project.service';
import { supabaseClient, DEFAULT_USER_ID } from '@/db/supabase.client'; // Assuming supabaseClient is directly importable

const MOCK_PROJECTS: ProjectViewModel[] = [
	{
		id: '1',
		name: 'Projekt 1',
		description: 'Opis projektu 1',
		href: '/projects/1',
	},
	{
		id: '2',
		name: 'Projekt 2',
		description: 'Opis projektu 2',
		href: '/projects/2',
	},
	{
		id: '3',
		name: 'Projekt 3',
		description: null,
		href: '/projects/3',
	},
];

const USE_MOCK_SERVICES = import.meta.env.PUBLIC_MOCK_SERVICES === 'true';

const useProjects = () => {
	const [projects, setProjects] = useState<ProjectViewModel[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [error, setError] = useState<Error | null>(null);

	const projectService = new ProjectService(); // Instantiate ProjectService

	const fetchProjects = async () => {
		setIsLoading(true);
		setError(null);
		try {
			if (USE_MOCK_SERVICES) {
				setProjects(MOCK_PROJECTS);
			} else {
				const fetchedProjects = await projectService.getProjects(supabaseClient, DEFAULT_USER_ID);
				setProjects(fetchedProjects.map(p => ({
					id: p.id,
					name: p.name,
					description: p.description,
					href: `/projects/${p.id}`,
				})));
			}
		} catch (err) {
			setError(err as Error);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchProjects();
	}, []);

	const createProject = async (data: ProjectCreateCommand): Promise<void> => {
		setIsLoading(true); // Set loading state for creation
		setError(null);
		try {
			if (USE_MOCK_SERVICES) {
				return new Promise((resolve) => {
					setTimeout(() => {
						const newProject: ProjectViewModel = {
							id: String(projects.length + 1),
							name: data.name,
							description: data.description,
							href: `/projects/${projects.length + 1}`,
						};
						setProjects((prev) => [newProject, ...prev]);
						resolve();
					}, 500);
				});
			} else {
				await projectService.createProject(supabaseClient, DEFAULT_USER_ID, data);
				await fetchProjects(); // Refetch projects after creation
			}
		} catch (err) {
			setError(err as Error);
		} finally {
			setIsLoading(false); // Reset loading state
		}
	};

	const refetch = () => {
		fetchProjects();
	};

	return { projects, isLoading, error, createProject, refetch };
};

export default useProjects;