import { AddTaskForm } from "./AddTaskForm";
import { Info } from "lucide-react";

export interface TaskListHeaderProps {
  onAddTask: (title: string) => void;
  isLoading: boolean;
  isReadOnly?: boolean;
}

export function TaskListHeader({ onAddTask, isLoading, isReadOnly }: TaskListHeaderProps) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-card p-4">
      <h2 className="text-2xl font-bold">Tasks</h2>
      <div className="w-full max-w-md">
        {isReadOnly ? (
          <div className="flex items-center gap-2 rounded-md border border-dashed border-input bg-background/50 p-3 text-sm text-muted-foreground">
            <Info className="h-4 w-4 flex-shrink-0" />
            <span>This task is delegated to the AI. Sub-tasks are managed by the assistant.</span>
          </div>
        ) : (
          <AddTaskForm onAddTask={onAddTask} isLoading={isLoading} />
        )}
      </div>
    </div>
  );
}
