import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { ProjectViewModel } from '@/types';

interface ProjectCardProps {
	project: ProjectViewModel;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
	return (
		<a href={project.href} className="block">
			<Card className="h-full hover:shadow-md transition-shadow">
				<CardHeader>
					<CardTitle>{project.name}</CardTitle>
					{project.description && <CardDescription>{project.description}</CardDescription>}
				</CardHeader>
			</Card>
		</a>
	);
};

export default ProjectCard;