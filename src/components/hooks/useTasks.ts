import { useState } from 'react';
import type { ReorderTasksDto, Task, TaskUpdateCommand, TaskViewModel } from '@/types';
import { toast } from 'sonner';

export function useTasks(
  initialTasks: Task[],
  projectId: string,
  parentId: string | null
) {
  const [tasks, setTasks] = useState<TaskViewModel[]>(initialTasks);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const addTask = async (title: string) => {
    const optimisticId = `optimistic-${Date.now()}`;
    const newTask: TaskViewModel = {
      id: optimisticId,
      title,
      description: null,
      project_id: projectId,
      parent_id: parentId,
      status_id: 1, // 'To Do'
      position: (tasks[tasks.length - 1]?.position ?? 0) + 1,
      is_delegated: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by_ai: false,
      isMutating: true,
    };

    setTasks((currentTasks) => [...currentTasks, newTask]);

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          project_id: projectId,
          parent_id: parentId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create task');
      }

      const createdTask: Task = await response.json();

      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === optimisticId ? { ...task, ...createdTask, isMutating: false } : task
        )
      );
    } catch (e) {
      toast.error('Failed to create task. Please try again.');
      setTasks((currentTasks) => currentTasks.filter((task) => task.id !== optimisticId));
      setError(e as Error);
    }
  };

  const updateTask = async (taskId: string, data: TaskUpdateCommand) => {
    const originalTasks = tasks;
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId ? { ...task, ...data, isMutating: true } : task
      )
    );

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      const updatedTask: Task = await response.json();

      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === taskId ? { ...task, ...updatedTask, isMutating: false } : task
        )
      );
    } catch (e) {
      toast.error('Failed to update task. Please try again.');
      setTasks(originalTasks);
      setError(e as Error);
    }
  };

  const delegateTask = async (taskId: string) => {
    await updateTask(taskId, { is_delegated: true });
  };

  const cancelTask = async (taskId: string) => {
    await updateTask(taskId, { status_id: 3 }); // 3: Canceled
  };

  const reorderTasks = async (reorderedTasks: TaskViewModel[]) => {
    const originalTasks = tasks;
    setTasks(reorderedTasks);

    const dto: ReorderTasksDto = {
      tasks: reorderedTasks.map((task, index) => ({
        id: task.id,
        position: index + 1,
      })),
    };

    try {
      const response = await fetch('/api/tasks/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
      });

      if (!response.ok) {
        throw new Error('Failed to reorder tasks');
      }
    } catch (e) {
      toast.error('Failed to reorder tasks. Please try again.');
      setTasks(originalTasks);
      setError(e as Error);
    }
  };

  const acceptProposal = async (taskId: string) => {
    const originalTasks = tasks;
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId ? { ...task, isMutating: true } : task
      )
    );

    try {
      const response = await fetch(`/api/tasks/${taskId}/accept-proposal`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to accept proposal');
      }

      const updatedTask: Task = await response.json();
      toast.success('Proposal accepted!');
      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === taskId ? { ...task, ...updatedTask, isMutating: false } : task
        )
      );
    } catch (e) {
      toast.error('Failed to accept proposal. Please try again.');
      setTasks(originalTasks);
      setError(e as Error);
    }
  };

    const rejectProposal = async (taskId: string, comment: string) => {
        const originalTasks = tasks;
        setTasks((currentTasks) =>
            currentTasks.map((task) =>
                task.id === taskId ? { ...task, isMutating: true } : task
            )
        );

        try {
            const response = await fetch(`/api/tasks/${taskId}/reject-proposal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comment }),
            });

            if (!response.ok) {
                throw new Error('Failed to reject proposal');
            }

            const updatedTask: Task = await response.json();
            toast.success('Proposal rejected!');
            setTasks((currentTasks) =>
                currentTasks.map((task) =>
                    task.id === taskId ? { ...task, ...updatedTask, isMutating: false } : task
                )
            );
        } catch (e) {
            toast.error('Failed to reject proposal. Please try again.');
            setTasks(originalTasks);
            setError(e as Error);
        }
    };

  return {
    tasks,
    isLoading,
    error,
    addTask,
    updateTask,
    delegateTask,
    cancelTask,
    reorderTasks,
    acceptProposal,
    rejectProposal,
  };
}
