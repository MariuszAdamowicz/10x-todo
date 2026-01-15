/* eslint-disable react-compiler/react-compiler */
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { TaskUpdateCommand, TaskViewModel } from "@/types";
import { TaskItem } from "./TaskItem";

export interface TaskListProps {
  projectId: string;
  tasks: TaskViewModel[];
  onUpdateTask: (taskId: string, data: Partial<TaskUpdateCommand>) => void;
  onReorderTasks: (reorderedTasks: TaskViewModel[]) => void;
  onAcceptProposal: (taskId: string) => void;
  onRejectProposal: (task: TaskViewModel) => void;
  onCancelTask: (taskId: string) => void;
}

export function TaskList({
  projectId,
  tasks,
  onUpdateTask,
  onReorderTasks,
  onAcceptProposal,
  onRejectProposal,
  onCancelTask,
}: TaskListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = tasks.findIndex((t) => t.id === active.id);
      const newIndex = tasks.findIndex((t) => t.id === over.id);
      const reordered = arrayMove(tasks, oldIndex, newIndex);
      onReorderTasks(reordered);
    }
  };

  const handleNavigate = (taskId: string) => {
    window.location.href = `/projects/${projectId}/tasks/${taskId}`;
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={tasks} strategy={verticalListSortingStrategy}>
        <ul className="mt-4 space-y-2" data-test-id="task-list">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onUpdate={onUpdateTask}
              onNavigate={handleNavigate}
              onCancel={onCancelTask}
              onAcceptProposal={onAcceptProposal}
              onRejectProposal={onRejectProposal}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
