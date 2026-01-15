import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

export interface RejectProposalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (comment: string) => void;
  isLoading: boolean;
}

export function RejectProposalDialog({ isOpen, onClose, onSubmit, isLoading }: RejectProposalDialogProps) {
  const [comment, setComment] = useState("");

  const handleSubmit = () => {
    if (!comment.trim()) return;
    onSubmit(comment.trim());
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Proposal</DialogTitle>
          <DialogDescription>
            Please provide a reason for rejecting the AI&apos;s proposal. This feedback will help the assistant learn.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder="Type your feedback here..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !comment.trim()}>
            {isLoading ? "Submitting..." : "Submit Rejection"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
