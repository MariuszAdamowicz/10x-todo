import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import type { Task, TaskUpdateCommand, TaskViewModel } from "@/types";
import { Bot, User, Pencil, Save } from "lucide-react";
import { useState, useMemo, useEffect } from "react";

interface TaskDetailHeaderProps {
  parentTask: Task;
  tasks: TaskViewModel[];
  onUpdateTask: (taskId: string, data: TaskUpdateCommand) => void;
}

export const TaskDetailHeader = ({ parentTask, tasks, onUpdateTask }: TaskDetailHeaderProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(parentTask.title);

  useEffect(() => {
    setTitle(parentTask.title);
  }, [parentTask.title]);

  const stats = useMemo(() => {
    const active = tasks.filter((t) => t.status_id === 1).length;
    const completed = tasks.filter((t) => t.status_id === 2).length;
    const canceled = tasks.filter((t) => t.status_id === 3).length;
    return { active, completed, canceled };
  }, [tasks]);

  const handleTitleBlur = () => {
    if (title !== parentTask.title) {
      onUpdateTask(parentTask.id, { title });
    }
    setIsEditing(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleTitleBlur();
    }
  };

  const handleToggleDelegation = (isPressed: boolean) => {
    onUpdateTask(parentTask.id, { is_delegated: isPressed });
  };

  const isDelegationLocked = parentTask.delegation_locked_at != null;
  const isTaskFinished = parentTask.status_id === 2 || parentTask.status_id === 3;

  const delegateToggleColor = parentTask.is_delegated
    ? isDelegationLocked
      ? "bg-red-200 hover:bg-red-300"
      : "bg-green-200 hover:bg-green-300"
    : "";

  return (
    <div className="p-4 border-b bg-muted/20">
      <div className="flex items-center gap-4">
        <div className="flex-grow flex items-center gap-2">
          {isEditing ? (
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
            />
          ) : (
            <h2 className="text-2xl font-bold">{parentTask.title}</h2>
          )}
          <Button variant="ghost" size="icon" onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? <Save className="h-5 w-5" /> : <Pencil className="h-5 w-5" />}
          </Button>
        </div>
        <Toggle
          aria-label="Delegate task"
          pressed={parentTask.is_delegated}
          onPressedChange={handleToggleDelegation}
          className={delegateToggleColor}
          disabled={isDelegationLocked || isTaskFinished}
        >
          {parentTask.is_delegated ? <Bot className="h-5 w-5" /> : <User className="h-5 w-5" />}
        </Toggle>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Badge variant="outline">Active: {stats.active}</Badge>
        <Badge variant="secondary">Completed: {stats.completed}</Badge>
        <Badge variant="destructive">Canceled: {stats.canceled}</Badge>
      </div>
    </div>
  );
};
