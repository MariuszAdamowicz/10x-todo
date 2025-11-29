import type { IBreadcrumb, Project, Task, TaskWithComments } from '@/types';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from './Breadcrumbs';
import { TaskList } from './TaskList';

export interface ProjectAndTasksViewProps {
  project: Project;
  initialTasks: TaskWithComments[];
  breadcrumbs: IBreadcrumb[];
  parentId: string | null;
}

export function ProjectAndTasksView({
  project,
  initialTasks,
  breadcrumbs,
  parentId,
}: ProjectAndTasksViewProps) {
  return (
    <div className="container mx-auto flex flex-col gap-4 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{project.name}</h1>
          {project.description && (
            <p className="mt-2 text-muted-foreground">{project.description}</p>
          )}
        </div>
        <a href={`/projects/${project.id}/settings`}>
          <Button variant="outline" size="icon">
            <Settings className="h-4 w-4" />
            <span className="sr-only">Project Settings</span>
          </Button>
        </a>
      </div>

      <Breadcrumbs items={breadcrumbs} />

      <TaskList initialTasks={initialTasks} projectId={project.id} parentId={parentId} />
    </div>
  );
}
