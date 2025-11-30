import { useState, useMemo } from "react";
import type { ReorderTasksDto, TaskUpdateCommand, TaskViewModel, TaskWithComments } from "@/types";
import { toast } from "sonner";

const mapToViewModel = (task: TaskWithComments): TaskViewModel => {
  const isPendingUserAction = task.status_id === 4 || task.status_id === 5;
  const aiProposalComment =
    isPendingUserAction && task.task_comments && task.task_comments.length > 0
      ? task.task_comments.find((c) => c.author_is_ai)
      : undefined;

  return {
    ...task,
    isMutating: false,
    isError: false,
    isPendingUserAction,
    aiProposalComment,
  };
};

export function useTasks(initialTasks: TaskWithComments[], projectId: string, parentId: string | null) {
  const [tasks, setTasks] = useState<TaskViewModel[]>(() => initialTasks.map(mapToViewModel));
  const [isLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sortedTasks = useMemo(() => {
    const activeTasks = tasks.filter((task) => task.status_id === 1);
    const inactiveTasks = tasks.filter((task) => task.status_id !== 1);

    activeTasks.sort((a, b) => a.position - b.position);
    inactiveTasks.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    return [...activeTasks, ...inactiveTasks];
  }, [tasks]);

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
      active_subtask_count: 0,
      completed_subtask_count: 0,
      canceled_subtask_count: 0,
    };

    setTasks((currentTasks) => [...currentTasks, newTask]);

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          project_id: projectId,
          parent_id: parentId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to create task" }));
        throw new Error(errorData.message);
      }

      const createdTask: TaskWithComments = await response.json();

      setTasks((currentTasks) =>
        currentTasks.map((task) => (task.id === optimisticId ? mapToViewModel(createdTask) : task))
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
      currentTasks.map((task) => (task.id === taskId ? { ...task, ...data, isMutating: true } : task))
    );

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to update task" }));
        throw new Error(errorData.message);
      }

      const updatedTask: TaskWithComments = await response.json();

      setTasks((currentTasks) => currentTasks.map((task) => (task.id === taskId ? mapToViewModel(updatedTask) : task)));
    } catch (e) {
      toast.error((e as Error).message);
      setTasks(originalTasks);
      setError(e as Error);
    }
  };

  const reorderTasks = async (reorderedTasks: TaskViewModel[]) => {
    const originalTasks = tasks;

    // We only care about the reordering of active tasks.
    const activeReordered = reorderedTasks.filter((t) => t.status_id === 1);
    const activeWithNewPositions = activeReordered.map((task, index) => ({
      ...task,
      position: index, // Assign new sequential positions
    }));

    const updatedTasksMap = new Map(activeWithNewPositions.map((t) => [t.id, t]));
    const newTasksState = originalTasks.map((t) => updatedTasksMap.get(t.id) || t);

    setTasks(newTasksState);

    const dto: ReorderTasksDto = {
      tasks: activeWithNewPositions.map(({ id, position }) => ({
        id,
        order: position,
      })),
    };

    try {
      const response = await fetch("/api/tasks/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      });

      if (response.status !== 204) {
        const errorData = await response.json().catch(() => ({ message: "Failed to reorder tasks" }));
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
    setTasks((currentTasks) => currentTasks.map((task) => (task.id === taskId ? { ...task, isMutating: true } : task)));

    try {
      const response = await fetch(`/api/tasks/${taskId}/accept-proposal`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to accept proposal" }));
        throw new Error(errorData.message);
      }

      const updatedTask: TaskWithComments = await response.json();
      toast.success("Proposal accepted!");
      setTasks((currentTasks) => currentTasks.map((task) => (task.id === taskId ? mapToViewModel(updatedTask) : task)));
    } catch (e) {
      toast.error((e as Error).message);
      setTasks(originalTasks);
      setError(e as Error);
    }
  };

  const rejectProposal = async (taskId: string, comment: string) => {
    const originalTasks = tasks;
    setTasks((currentTasks) => currentTasks.map((task) => (task.id === taskId ? { ...task, isMutating: true } : task)));

    try {
      const response = await fetch(`/api/tasks/${taskId}/reject-proposal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to reject proposal" }));
        throw new Error(errorData.message);
      }

      const updatedTask: TaskWithComments = await response.json();
      toast.success("Proposal rejected!");
      setTasks((currentTasks) => currentTasks.map((task) => (task.id === taskId ? mapToViewModel(updatedTask) : task)));
    } catch (e) {
      toast.error((e as Error).message);
      setTasks(originalTasks);
      setError(e as Error);
    }
  };

  return {
    tasks: sortedTasks,
    isLoading,
    error,
    addTask,
    updateTask,
    reorderTasks,
    acceptProposal,
    rejectProposal,
  };
}
