import { z } from 'zod';

export const TaskCreateSchema = z.object({
  title: z.string().min(1, { message: 'Tytuł jest wymagany.' }),
  description: z.string().nullable().optional(),
  parent_id: z.string().uuid().nullable().optional(),
  project_id: z.string().uuid().optional(), // Wymagane dla użytkownika, opcjonalne dla AI
});

export const TaskUpdateSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().nullable(),
    status_id: z.number().int(),
    is_delegated: z.boolean(),
  })
  .partial()
  .refine(data => Object.keys(data).length > 0, {
    message: 'Request body must not be empty.',
  });

export const GetTasksQuerySchema = z.object({
  projectId: z.string().uuid().optional(), // Wymagane dla użytkownika, nieobecne dla AI
  parentId: z.string().uuid().optional(),
  statusId: z.coerce.number().int().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  delegated: z.coerce.boolean().optional(),
});

export const taskProposeStatusSchema = z.object({
	new_status_id: z.number().int(),
	comment: z.string().min(1, { message: 'Komentarz jest wymagany.' }),
});

export const taskRejectProposalSchema = z.object({
	comment: z.string().min(1, { message: 'Komentarz jest wymagany.' }),
});
