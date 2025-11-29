import { AddTaskForm } from "./AddTaskForm";

export interface TaskListHeaderProps {
  onAddTask: (title: string) => void;
  isLoading: boolean;
}

export function TaskListHeader({ onAddTask, isLoading }: TaskListHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-bold">Tasks</h2>
      <div className="w-1/2">
        <AddTaskForm onAddTask={onAddTask} isLoading={isLoading} />
      </div>
    </div>
  );
}
