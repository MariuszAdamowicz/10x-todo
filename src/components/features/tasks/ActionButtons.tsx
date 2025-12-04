import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TaskViewModel } from "@/types";
import { MoreHorizontal } from "lucide-react";

export interface ActionButtonsProps {
  task: TaskViewModel;
  onCancel: (id: string) => void;
}

export function ActionButtons({ task, onCancel }: ActionButtonsProps) {
  const isMutating = task.isMutating;
  const isDelegated = task.is_delegated;
  const canCancel = (task.active_subtask_count ?? 0) === 0 && (task.completed_subtask_count ?? 0) === 0;

  return (
    <div className="flex items-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" disabled={isMutating}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem
            onClick={() => onCancel(task.id)}
            disabled={isDelegated || !canCancel}
            className="text-red-500"
          >
            Cancel Task
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
