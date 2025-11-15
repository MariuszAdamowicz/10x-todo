import React from 'react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from '@/components/ui/dialog';
import ProjectForm from './ProjectForm';
import type { ProjectCreateCommand } from '@/types';

interface CreateProjectModalProps {
	isOpen: boolean;
	onOpenChange: (isOpen: boolean) => void;
	onSubmit: (data: ProjectCreateCommand) => Promise<void>;
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
	isOpen,
	onOpenChange,
	onSubmit,
}) => {
	const [isSubmitting, setIsSubmitting] = React.useState(false);

	const handleSubmit = async (data: ProjectCreateCommand) => {
		setIsSubmitting(true);
		try {
			await onSubmit(data);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Utwórz nowy projekt</DialogTitle>
					<DialogDescription>
						Wypełnij poniższe pola, aby stworzyć nowy projekt.
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					<ProjectForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
				</div>
				<DialogFooter>
					{/* Można tu dodać dodatkowe przyciski, np. "Anuluj" */}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default CreateProjectModal;