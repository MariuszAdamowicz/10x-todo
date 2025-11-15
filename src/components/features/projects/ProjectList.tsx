import React from 'react';
import ProjectCard from './ProjectCard';
import type { ProjectViewModel } from '@/types';

interface ProjectListProps {
	projects: ProjectViewModel[];
}

const ProjectList: React.FC<ProjectListProps> = ({ projects }) => {
	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{projects.map((project) => (
				<ProjectCard key={project.id} project={project} />
			))}
		</div>
	);
};

export default ProjectList;