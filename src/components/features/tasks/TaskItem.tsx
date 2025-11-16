import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import type { TaskViewModel } from '@/types';
import { useMemo, useState } from 'react';
import { ActionButtons } from './ActionButtons';
import { ProposalNotification } from './ProposalNotification';

export interface TaskItemProps {
  task: TaskViewModel;
  onUpdate: (id: string, data: Partial<TaskViewModel>) => void;
  onNavigate: (id: string) => void;
  onDelegate: (id: string) => void;
  onCancel: (id: string) => void;
  onAddSubtask: (id: string) => void;
  onAcceptProposal: (id: string) => void;
  onRejectProposal: (task: TaskViewModel) => void;
}

export function TaskItem({
  task,
  onUpdate,
  onNavigate,
  onDelegate,
  onCancel,
  onAddSubtask,
  onAcceptProposal,
  onRejectProposal,
}: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title);

    const isPendingUserAction = useMemo(
        () => task.status_id === 4 || task.status_id === 5,
        [task.status_id]
    );


  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: isPendingUserAction });

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
    if (task.status_id === 3 && !checked) { // From Canceled to To Do
        onUpdate(task.id, { status_id: 1 });
    } else {
        onUpdate(task.id, { status_id: newStatus });
    }
  };

  const isChecked = task.status_id === 2 || task.status_id === 3;


  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border bg-background p-4 ${
        task.isMutating ? 'opacity-50' : ''
      } ${isDragging ? 'shadow-lg' : ''}`}
    >
      <div className="flex items-center space-x-4">
        <div {...attributes} {...listeners} className="cursor-grab touch-none p-2">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
        <Checkbox
          checked={isChecked}
          onCheckedChange={handleStatusChange}
          disabled={task.isMutating || isPendingUserAction}
        />
        {isEditing ? (
          <Input
            value={title}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => e.key === 'Enter' && handleTitleBlur()}
            autoFocus
            className="flex-1"
          />
        ) : (
          <span
            className={`flex-1 cursor-pointer ${
              isChecked ? 'text-muted-foreground line-through' : ''
            }`}
            onDoubleClick={() => !task.is_delegated && !isPendingUserAction && setIsEditing(true)}
          >
            {task.title}
          </span>
        )}
        <ActionButtons
          task={task}
          onDelegate={onDelegate}
          onAddSubtask={onAddSubtask}
          onCancel={onCancel}
        />
      </div>
      {isPendingUserAction && task.aiProposalComment && (
        <ProposalNotification
            // @ts-ignore TODO: fix type
          comment={task.aiProposalComment}
          onAccept={() => onAcceptProposal(task.id)}
          onReject={() => onRejectProposal(task)}
          isLoading={task.isMutating ?? false}
        />
      )}
    </li>
  );
}
