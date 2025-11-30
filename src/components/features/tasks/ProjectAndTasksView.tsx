import type { IBreadcrumb, Project, Task, TaskUpdateCommand, TaskWithComments, TaskViewModel } from "@/types";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "./Breadcrumbs";
import { TaskList } from "./TaskList";
import { useTasks } from "@/components/hooks/useTasks";
import { useState } from "react";
import { RejectProposalDialog } from "./RejectProposalDialog";
import { TaskListHeader } from "./TaskListHeader";
import { TaskDetailHeader } from "./TaskDetailHeader";

export interface ProjectAndTasksViewProps {
  project: Project;
  initialTasks: TaskWithComments[];
  breadcrumbs: IBreadcrumb[];
  parentTask: Task | null;
}

export function ProjectAndTasksView({
  project,
  initialTasks,
  breadcrumbs,
  parentTask,
}: ProjectAndTasksViewProps) {
  const [currentParentTask, setCurrentParentTask] = useState(parentTask);
  const parentId = currentParentTask?.id ?? null;

  const { tasks, addTask, updateTask, reorderTasks, acceptProposal, rejectProposal, isLoading } = useTasks(
    initialTasks,
    project.id,
    parentId
  );

  const [isRejecting, setIsRejecting] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskViewModel | null>(null);

  const handleOpenRejectDialog = (task: TaskViewModel) => {
    setSelectedTask(task);
    setIsRejecting(true);
  };

  const handleRejectSubmit = (comment: string) => {
    if (selectedTask) {
      rejectProposal(selectedTask.id, comment);
    }
    setIsRejecting(false);
    setSelectedTask(null);
  };

  const handleCancelTask = (taskId: string) => {
    updateTask(taskId, { status_id: 3 });
  };

  const handleUpdateTask = (taskId: string, data: TaskUpdateCommand) => {
    // Optimistically update the parent task if it's the one being edited
    if (currentParentTask && taskId === currentParentTask.id) {
      setCurrentParentTask((prev) => (prev ? { ...prev, ...data } : null));
    }
    // Call the original updateTask from the hook to update the list and the backend
    updateTask(taskId, data);
  };

  return (
    <div className="container mx-auto flex flex-col gap-4 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{project.name}</h1>
          {project.description && <p className="mt-2 text-muted-foreground">{project.description}</p>}
        </div>
        <a href={`/projects/${project.id}/settings`}>
          <Button variant="outline" size="icon">
            <Settings className="h-4 w-4" />
            <span className="sr-only">Project Settings</span>
          </Button>
        </a>
      </div>

      <Breadcrumbs items={breadcrumbs} />

      {currentParentTask && (
        <TaskDetailHeader parentTask={currentParentTask} tasks={tasks} onUpdateTask={handleUpdateTask} />
      )}

      <TaskListHeader onAddTask={addTask} isLoading={isLoading} />
      <TaskList
        projectId={project.id}
        tasks={tasks}
        onUpdateTask={handleUpdateTask}
        onReorderTasks={reorderTasks}
        onAcceptProposal={acceptProposal}
        onRejectProposal={handleOpenRejectDialog}
        onCancelTask={handleCancelTask}
      />
      <RejectProposalDialog
        isOpen={isRejecting}
        onClose={() => setIsRejecting(false)}
        onSubmit={handleRejectSubmit}
        isLoading={selectedTask?.isMutating ?? false}
      />
    </div>
  );
}
