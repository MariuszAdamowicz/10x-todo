import {
	DndContext,
	closestCenter,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import {
	SortableContext,
	arrayMove,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useTasks } from '@/components/hooks/useTasks';
import type { Task, TaskViewModel } from '@/types';
import { useState } from 'react';
import { RejectProposalDialog } from './RejectProposalDialog';
import { TaskItem } from './TaskItem';
import { TaskListHeader } from './TaskListHeader';

export interface TaskListProps {
	initialTasks: Task[];
	projectId: string;
	parentId: string | null;
}

export function TaskList({ initialTasks, projectId, parentId }: TaskListProps) {
	const {
		tasks,
		addTask,
		updateTask,
		delegateTask,
		cancelTask,
		reorderTasks,
		acceptProposal,
		rejectProposal,
		isLoading,
	} = useTasks(initialTasks, projectId, parentId);

	const [isRejecting, setIsRejecting] = useState(false);
	const [selectedTask, setSelectedTask] = useState<TaskViewModel | null>(null);

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
			reorderTasks(reordered);
		}
	};

	const handleNavigate = (taskId: string) => {
		window.location.href = `/projects/${projectId}/tasks/${taskId}`;
	};

	const handleAddSubtask = (taskId: string) => {
		// TODO: Implement add subtask
		console.log('Adding subtask for:', taskId);
	};

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

	return (
		<div>
			<TaskListHeader onAddTask={addTask} isLoading={isLoading} />
			<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
				<SortableContext items={tasks} strategy={verticalListSortingStrategy}>
					<ul className="mt-4 space-y-2">
						{tasks.map((task) => (
							<TaskItem
								key={task.id}
								task={task}
								onUpdate={updateTask}
								onNavigate={handleNavigate}
								onDelegate={delegateTask}
								onCancel={cancelTask}
								onAddSubtask={handleAddSubtask}
								onAcceptProposal={acceptProposal}
								onRejectProposal={handleOpenRejectDialog}
							/>
						))}
					</ul>
				</SortableContext>
			</DndContext>
			<RejectProposalDialog
				isOpen={isRejecting}
				onClose={() => setIsRejecting(false)}
				onSubmit={handleRejectSubmit}
				isLoading={selectedTask?.isMutating ?? false}
			/>
		</div>
	);
}
