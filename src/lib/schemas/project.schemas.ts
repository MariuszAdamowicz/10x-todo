import { z } from 'zod';

export const ProjectIdSchema = z.string().uuid({ message: 'Nieprawidłowy format identyfikatora projektu.' });

export const ProjectCreateSchema = z.object({
	name: z.string().min(1, 'Nazwa projektu jest wymagana.'),
	description: z.string().nullable(),
});

export const ProjectUpdateSchema = z.object({
  name: z.string().min(1, "Nazwa projektu jest wymagana."),
  description: z.string().nullable(),
});
