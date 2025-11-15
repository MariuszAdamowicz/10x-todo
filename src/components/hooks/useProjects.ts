import { useState, useEffect } from 'react';
import type { ProjectViewModel, ProjectCreateCommand } from '@/types';

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

const useProjects = () => {
	const [projects, setProjects] = useState<ProjectViewModel[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		// Simulate API call
		setIsLoading(true);
		setError(null);
		setTimeout(() => {
			try {
				setProjects(MOCK_PROJECTS);
			} catch (err) {
				setError(err as Error);
			} finally {
				setIsLoading(false);
			}
		}, 1000);
	}, []);

	const createProject = async (data: ProjectCreateCommand): Promise<void> => {
		// Simulate API call for creating a project
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
	};

	const refetch = () => {
		// Simulate API call
		setIsLoading(true);
		setError(null);
		setTimeout(() => {
			try {
				setProjects(MOCK_PROJECTS);
			} catch (err) {
				setError(err as Error);
			} finally {
				setIsLoading(false);
			}
		}, 1000);
	};

	return { projects, isLoading, error, createProject, refetch };
};

export default useProjects;