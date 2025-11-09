import type { APIContext } from 'astro';
import { z } from 'zod';

import { DEFAULT_USER_ID } from '@/db/supabase.client';
import { projectService } from '@/lib/services/project.service';

export const prerender = false;

const idSchema = z.string().uuid();

/**
 * @swagger
 * /api/projects/{id}:
 *   get:
 *     summary: Get project details by ID
 *     description: Retrieves detailed information about a single project based on its unique ID. Access is restricted to the project owner.
 *     tags:
 *       - Projects
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique identifier of the project.
 *     responses:
 *       '200':
 *         description: Successfully retrieved project details.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProjectGetDetailsDto'
 *       '400':
 *         description: Bad Request - The provided ID is not a valid UUID.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Invalid project ID format.
 *       '401':
 *         description: Unauthorized - User is not authenticated.
 *       '404':
 *         description: Not Found - The project with the specified ID does not exist or the user does not have permission to access it.
 *       '500':
 *         description: Internal Server Error - An unexpected error occurred on the server.
 */
export async function GET(context: APIContext): Promise<Response> {
	const { id } = context.params;
	const { supabase } = context.locals;

	const validationResult = idSchema.safeParse(id);

	if (!validationResult.success) {
		return new Response(JSON.stringify({ error: 'Invalid project ID format.' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const validatedId = validationResult.data;

	try {
		const project = await projectService.getProjectById(supabase, validatedId, DEFAULT_USER_ID);

		if (!project) {
			return new Response(JSON.stringify({ error: 'Project not found.' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		return new Response(JSON.stringify(project), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		console.error('Error fetching project:', error);
		return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}
