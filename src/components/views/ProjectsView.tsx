import React, { useState } from 'react';
import useProjects from '@/components/hooks/useProjects';
import ProjectList from '@/components/features/projects/ProjectList';
import ProjectListSkeleton from '@/components/features/projects/ProjectListSkeleton';
import EmptyState from '@/components/features/projects/EmptyState';
import CreateProjectModal from '@/components/features/projects/CreateProjectModal';
import { Button } from '@/components/ui/button';
import type { ProjectCreateCommand } from '@/types';

const ProjectsView = () => {
	const { projects, isLoading, error, createProject, refetch } = useProjects();
	const [isModalOpen, setIsModalOpen] = useState(false);

	const handleCreateProject = async (data: ProjectCreateCommand) => {
		await createProject(data);
		setIsModalOpen(false);
	};

	if (error) {
		return (
			<div className="text-center text-red-500">
				<p>Nie udało się załadować projektów: {error.message}</p>
				<Button onClick={refetch} className="mt-4">
					Spróbuj ponownie
				</Button>
			</div>
		);
	}

	return (
		<div className="container mx-auto p-4">
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-3xl font-bold">Moje Projekty</h1>
				<Button onClick={() => setIsModalOpen(true)}>Utwórz nowy projekt</Button>
			</div>

			{isLoading ? (
				<ProjectListSkeleton />
			) : projects.length === 0 ? (
				<EmptyState />
			) : (
				<ProjectList projects={projects} />
			)}

			<CreateProjectModal
				isOpen={isModalOpen}
				onOpenChange={setIsModalOpen}
				onSubmit={handleCreateProject}
			/>
		</div>
	);
};

export default ProjectsView;