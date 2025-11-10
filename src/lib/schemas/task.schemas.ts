import { z } from 'zod';

export const TaskCreateSchema = z.object({
  title: z.string().min(1, { message: 'Tytuł jest wymagany.' }),
  description: z.string().nullable().optional(),
  parent_id: z.string().uuid().nullable().optional(),
  project_id: z.string().uuid(), // Wymagane dla użytkownika, walidowane w serwisie
});

export const GetTasksQuerySchema = z.object({
  projectId: z.string().uuid().optional(), // Wymagane dla użytkownika, nieobecne dla AI
  parentId: z.string().uuid().optional(),
  statusId: z.coerce.number().int().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  delegated: z.coerce.boolean().optional(),
});
