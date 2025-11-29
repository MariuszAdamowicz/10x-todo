import { useState } from 'react';
import type { ReorderTasksDto, TaskUpdateCommand, TaskViewModel, TaskWithComments } from '@/types';
import { toast } from 'sonner';

const mapToViewModel = (task: TaskWithComments): TaskViewModel => {
  const isPendingUserAction = task.status_id === 4 || task.status_id === 5;
  const aiProposalComment =
    isPendingUserAction && task.task_comments && task.task_comments.length > 0
      ? task.task_comments.find(c => c.author_is_ai)
      : undefined;

  return {
    ...task,
    isMutating: false,
    isError: false,
    isPendingUserAction,
    aiProposalComment,
  };
};

export function useTasks(
  initialTasks: TaskWithComments[],
  projectId: string,
  parentId: string | null
) {
  const [tasks, setTasks] = useState<TaskViewModel[]>(() => initialTasks.map(mapToViewModel));
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
      task_comments: [],
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
        const errorData = await response.json().catch(() => ({ message: 'Failed to create task' }));
        throw new Error(errorData.message);
      }

      const createdTask: TaskWithComments = await response.json();

      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === optimisticId ? mapToViewModel(createdTask) : task
        )
      );
    } catch (e) {
      toast.error((e as Error).message);
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
        const errorData = await response.json().catch(() => ({ message: 'Failed to update task' }));
        throw new Error(errorData.message);
      }

      const updatedTask: TaskWithComments = await response.json();

      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === taskId ? mapToViewModel(updatedTask) : task
        )
      );
    } catch (e) {
      toast.error((e as Error).message);
      setTasks(originalTasks);
      setError(e as Error);
    }
  };

  const reorderTasks = async (reorderedTasks: TaskViewModel[]) => {
    const originalTasks = tasks;
    setTasks(reorderedTasks);

    const dto: ReorderTasksDto = {
      tasks: reorderedTasks.map((task, index) => ({
        id: task.id,
        order: index, 
      })),
    };

    try {
      const response = await fetch('/api/tasks/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
      });

      if (response.status !== 204) {
         const errorData = await response.json().catch(() => ({ message: 'Failed to reorder tasks' }));
        throw new Error(errorData.message);
      }
    } catch (e) {
      toast.error((e as Error).message);
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
        const errorData = await response.json().catch(() => ({ message: 'Failed to accept proposal' }));
        throw new Error(errorData.message);
      }

      const updatedTask: TaskWithComments = await response.json();
      toast.success('Proposal accepted!');
      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === taskId ? mapToViewModel(updatedTask) : task
        )
      );
    } catch (e) {
      toast.error((e as Error).message);
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
         const errorData = await response.json().catch(() => ({ message: 'Failed to reject proposal' }));
        throw new Error(errorData.message);
      }

      const updatedTask: TaskWithComments = await response.json();
      toast.success('Proposal rejected!');
      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === taskId ? mapToViewModel(updatedTask) : task
        )
      );
    } catch (e) {
      toast.error((e as Error).message);
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
    reorderTasks,
    acceptProposal,
    rejectProposal,
  };
}