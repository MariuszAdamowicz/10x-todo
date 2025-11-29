import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TaskViewModel } from "@/types";
import { MoreHorizontal, Plus, Share2 } from "lucide-react";

export interface ActionButtonsProps {
  task: TaskViewModel;
  onDelegate: (id: string) => void;
  onAddSubtask: (id: string) => void;
  onCancel: (id: string) => void;
}

export function ActionButtons({ task, onDelegate, onAddSubtask, onCancel }: ActionButtonsProps) {
  const isMutating = task.isMutating;
  const isDelegated = task.is_delegated;

  return (
    <div className="flex items-center space-x-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onDelegate(task.id)}
        disabled={isMutating || isDelegated}
        aria-label="Delegate task"
      >
        <Share2 className="mr-2 h-4 w-4" />
        {isDelegated ? "Delegated" : "Delegate"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onAddSubtask(task.id)}
        disabled={isMutating || isDelegated}
        aria-label="Add sub-task"
      >
        <Plus className="mr-2 h-4 w-4" />
        Sub-task
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" disabled={isMutating}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => onCancel(task.id)} disabled={isDelegated} className="text-red-500">
            Cancel Task
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
