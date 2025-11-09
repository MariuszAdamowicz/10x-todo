import type { APIContext } from 'astro';
import { z } from 'zod';

import { DEFAULT_USER_ID } from '@/db/supabase.client';
import { projectService } from '@/lib/services/project.service';
import type { ProjectUpdateCommand } from '@/types';

export const prerender = false;

const idSchema = z.string().uuid({ message: 'Invalid project ID format.' });

const projectUpdateSchema = z.object({
	name: z.string().min(1, 'Project name is required.'),
	description: z.string().nullable(),
});

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

/**
 * @swagger
 * /api/projects/{id}:
 *   put:
 *     summary: Update a project
 *     description: Updates an existing project's name and description. Access is restricted to the project owner.
 *     tags:
 *       - Projects
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique identifier of the project to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProjectUpdateCommand'
 *     responses:
 *       '200':
 *         description: Project updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProjectUpdateResultDto'
 *       '400':
 *         description: Bad Request - Invalid ID format or invalid request body.
 *       '401':
 *         description: Unauthorized - User is not authenticated.
 *       '404':
 *         description: Not Found - The project with the specified ID does not exist or the user does not have permission to access it.
 *       '500':
 *         description: Internal Server Error - An unexpected error occurred on the server.
 */
export async function PUT(context: APIContext): Promise<Response> {
	const { id } = context.params;
	const { supabase } = context.locals;

	// 1. Validate ID from path
	const idValidationResult = idSchema.safeParse(id);
	if (!idValidationResult.success) {
		return new Response(JSON.stringify({ error: idValidationResult.error.format() }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	const validatedId = idValidationResult.data;

	// 2. Validate request body
	let projectData: ProjectUpdateCommand;
	try {
		const body = await context.request.json();
		const bodyValidationResult = projectUpdateSchema.safeParse(body);
		if (!bodyValidationResult.success) {
			return new Response(JSON.stringify({ error: bodyValidationResult.error.format() }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		projectData = bodyValidationResult.data;
	} catch (error) {
		return new Response(JSON.stringify({ error: 'Bad Request: Malformed JSON.' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	// 3. Call the service to update the project
	try {
		const updatedProject = await projectService.updateProject(
			supabase,
			validatedId,
			DEFAULT_USER_ID,
			projectData,
		);

		if (!updatedProject) {
			return new Response(JSON.stringify({ error: 'Project not found or access denied.' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		return new Response(JSON.stringify(updatedProject), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		console.error('Error updating project:', error);
		return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}
