import { Button } from '@/components/ui/button';
import type { TaskComment } from '@/types';
import { Check, ThumbsDown } from 'lucide-react';

export interface ProposalNotificationProps {
  comment: TaskComment;
  onAccept: () => void;
  onReject: () => void;
  isLoading: boolean;
}

export function ProposalNotification({
  comment,
  onAccept,
  onReject,
  isLoading,
}: ProposalNotificationProps) {
  return (
    <div className="mt-2 rounded-lg border border-yellow-500 bg-yellow-50 p-3 text-sm text-yellow-800">
      <p className="font-semibold">AI Proposal:</p>
      <p className="italic">"{comment.comment}"</p>
      <div className="mt-2 flex justify-end space-x-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onReject}
          disabled={isLoading}
          className="border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600"
        >
          <ThumbsDown className="mr-2 h-4 w-4" />
          Reject
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onAccept}
          disabled={isLoading}
          className="border-green-500 text-green-500 hover:bg-green-50 hover:text-green-600"
        >
          <Check className="mr-2 h-4 w-4" />
          Accept
        </Button>
      </div>
    </div>
  );
}
