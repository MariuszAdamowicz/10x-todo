import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Bot, User } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { TaskUpdateCommand, TaskViewModel } from "@/types";
import { useState } from "react";
import { ActionButtons } from "./ActionButtons";
import { ProposalNotification } from "./ProposalNotification";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface TaskItemProps {
  task: TaskViewModel;
  onUpdate: (id: string, data: Partial<TaskUpdateCommand>) => void;
  onNavigate: (id: string) => void;
  onCancel: (id: string) => void;
  onAcceptProposal: (id: string) => void;
  onRejectProposal: (task: TaskViewModel) => void;
}

export function TaskItem({ task, onUpdate, onNavigate, onCancel, onAcceptProposal, onRejectProposal }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title);

  const { isPendingUserAction } = task;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: isPendingUserAction || isEditing || task.status_id !== 1,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : undefined,
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  const handleTitleBlur = () => {
    if (title.trim() && title !== task.title) {
      onUpdate(task.id, { title });
    }
    setIsEditing(false);
  };

  const handleStatusChange = (checked: boolean) => {
    const newStatus = checked ? 2 : 1; // 2: Done, 1: To Do
    onUpdate(task.id, { status_id: newStatus });
  };

  const handleItemClick = () => {
    if (!isEditing) {
      onNavigate(task.id);
    }
  };

  const handleDoubleClick = () => {
    if (!task.is_delegated && !isPendingUserAction) {
      setIsEditing(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isEditing) {
      onNavigate(task.id);
    }
  };

  const totalSubtasks =
    (task.active_subtask_count ?? 0) + (task.completed_subtask_count ?? 0) + (task.canceled_subtask_count ?? 0);

  const canComplete = (task.active_subtask_count ?? 0) === 0;

  const isChecked = task.status_id === 2;
  const isCanceled = task.status_id === 3;
  const isTaskFinished = isChecked || isCanceled;
  const isDelegationLocked = task.delegation_locked_at != null;

  const delegateToggleColor = task.is_delegated
    ? isDelegationLocked || isPendingUserAction
      ? "bg-red-200 hover:bg-red-300"
      : "bg-green-200 hover:bg-green-300"
    : "";

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg border bg-background p-4 cursor-pointer",
        task.isMutating && "opacity-50",
        isDragging && "shadow-lg",
        isCanceled && "bg-muted/50"
      )}
      onClick={handleItemClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-center space-x-4">
        <div {...attributes} {...listeners} className="cursor-grab touch-none p-2" onClick={(e) => e.stopPropagation()}>
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
        <div
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.key === "Enter" && e.stopPropagation()}
          role="button"
          tabIndex={0}
        >
          <Checkbox
            checked={isChecked}
            onCheckedChange={handleStatusChange}
            disabled={task.isMutating || isPendingUserAction || isCanceled || !canComplete}
          />
        </div>
        {isEditing ? (
          <div onClick={(e) => e.stopPropagation()} className="flex-1">
            <Input
              value={title}
              onChange={handleTitleChange}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTitleBlur();
                e.stopPropagation();
              }}
            />
          </div>
        ) : (
          <span className={cn("flex-1", (isChecked || isCanceled) && "text-muted-foreground line-through")}>
            {task.title}
          </span>
        )}
        <div className="flex items-center space-x-2">
          {totalSubtasks > 0 && (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <Badge variant="outline">{task.active_subtask_count ?? 0}</Badge>
              <Badge variant="secondary">{task.completed_subtask_count ?? 0}</Badge>
              <Badge variant="destructive">{task.canceled_subtask_count ?? 0}</Badge>
            </div>
          )}
        </div>
        <div
          className="flex items-center space-x-1"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          role="toolbar"
        >
          <Toggle
            aria-label="Delegate task"
            pressed={task.is_delegated}
            onPressedChange={(isPressed) => onUpdate(task.id, { is_delegated: isPressed })}
            className={delegateToggleColor}
            disabled={task.isMutating || isDelegationLocked || isTaskFinished}
          >
            {task.is_delegated ? <Bot className="h-5 w-5" /> : <User className="h-5 w-5" />}
          </Toggle>
          <ActionButtons task={task} onCancel={onCancel} />
        </div>
      </div>
      {isPendingUserAction && task.aiProposalComment && (
        <ProposalNotification
          comment={task.aiProposalComment}
          onAccept={() => onAcceptProposal(task.id)}
          onReject={() => onRejectProposal(task)}
          isLoading={task.isMutating ?? false}
        />
      )}
    </li>
  );
}
