import type { IBreadcrumb, Project, Task } from '@/types';
import { useEffect, useState } from 'react';
import { Breadcrumbs } from './Breadcrumbs';
import { TaskList } from './TaskList';
import { TaskListSkeleton } from './TaskListSkeleton';

export interface ProjectAndTasksViewProps {
  project: Project;
  tasks: Task[];
  breadcrumbs: IBreadcrumb[];
}

export function ProjectAndTasksView({ project, tasks, breadcrumbs }: ProjectAndTasksViewProps) {
  // TODO: Get parentId from the URL
  const parentId = null;
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000); // Simulate loading
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <Breadcrumbs items={breadcrumbs} />
      {isLoading ? (
        <TaskListSkeleton />
      ) : (
        <TaskList initialTasks={tasks} projectId={project.id} parentId={parentId} />
      )}
    </div>
  );
}
