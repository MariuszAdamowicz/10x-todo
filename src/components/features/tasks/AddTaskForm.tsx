import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export interface AddTaskFormProps {
  onAddTask: (title: string) => void;
  isLoading: boolean;
}

export function AddTaskForm({ onAddTask, isLoading }: AddTaskFormProps) {
  const [title, setTitle] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAddTask(title.trim());
    setTitle("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full items-center space-x-2">
      <Input
        type="text"
        placeholder="Add a new task..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={isLoading}
        data-test-id="new-task-input"
      />
      <Button type="submit" disabled={isLoading || !title.trim()} data-test-id="add-task-btn">
        {isLoading ? "Adding..." : "Add Task"}
      </Button>
    </form>
  );
}
