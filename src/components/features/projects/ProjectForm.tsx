import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ProjectCreateCommand } from '@/types';

const projectFormSchema = z.object({
	name: z.string().min(1, 'Nazwa projektu jest wymagana.'),
	description: z.string().nullable().optional(),
});

interface ProjectFormProps {
	onSubmit: (data: ProjectCreateCommand) => Promise<void>;
	isSubmitting: boolean;
}

const ProjectForm: React.FC<ProjectFormProps> = ({ onSubmit, isSubmitting }) => {
	const {
		register,
		handleSubmit,
		formState: { errors },
		reset,
	} = useForm<ProjectCreateCommand>({
		resolver: zodResolver(projectFormSchema),
		defaultValues: {
			name: '',
			description: '',
		},
	});

	const handleFormSubmit = async (data: ProjectCreateCommand) => {
		await onSubmit(data);
		reset(); // Reset form after successful submission
	};

	return (
		<form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
			<div>
				<Label htmlFor="name">Nazwa projektu</Label>
				<Input id="name" {...register('name')} disabled={isSubmitting} />
				{errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
			</div>
			<div>
				<Label htmlFor="description">Opis</Label>
				<Textarea id="description" {...register('description')} disabled={isSubmitting} />
			</div>
			<Button type="submit" className="w-full" disabled={isSubmitting}>
				{isSubmitting ? 'Tworzenie...' : 'Utwórz projekt'}
			</Button>
		</form>
	);
};

export default ProjectForm;