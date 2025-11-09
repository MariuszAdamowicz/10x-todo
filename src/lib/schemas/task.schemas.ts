import { z } from 'zod';

export const TaskCreateSchema = z.object({
  title: z.string().min(1, { message: 'Tytuł jest wymagany.' }),
  description: z.string().nullable().optional(),
  parent_id: z.string().uuid().nullable().optional(),
  project_id: z.string().uuid().optional(), // Wymagane dla użytkownika, walidowane w serwisie
});
