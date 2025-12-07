import type { APIContext } from "astro";
import { z } from "zod";

import { createSupabaseServer } from "@/db/supabase.client";
import { AuthorizationError, ProjectNotFoundError } from "@/lib/errors";
import { ProjectService } from "@/lib/services/project.service";
import type { ProjectUpdateCommand } from "@/types";

export const prerender = false;

const idSchema = z.string().uuid({ message: "Invalid project ID format." });

const projectUpdateSchema = z.object({
  name: z.string().min(1, "Project name is required."),
  description: z.string().nullable(),
});

/**
 * @description
 * Get project details by ID
 */
export async function GET(context: APIContext): Promise<Response> {
  const { user } = context.locals;
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const validationResult = idSchema.safeParse(context.params.id);
  if (!validationResult.success) {
    return new Response(JSON.stringify({ error: "Invalid project ID format." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const validatedId = validationResult.data;
  const supabase = createSupabaseServer({ cookies: context.cookies, headers: context.request.headers });

  try {
    const projectService = new ProjectService(supabase);
    const project = await projectService.getProjectById(validatedId, user.id);
    return new Response(JSON.stringify(project), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof ProjectNotFoundError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.error("Error fetching project:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * @description
 * Update a project
 */
export async function PUT(context: APIContext): Promise<Response> {
  const { user } = context.locals;
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  // 1. Validate ID from path
  const idValidationResult = idSchema.safeParse(context.params.id);
  if (!idValidationResult.success) {
    return new Response(JSON.stringify({ error: idValidationResult.error.format() }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const validatedId = idValidationResult.data;

  // 2. Validate request body
  let projectData: ProjectUpdateCommand;
  try {
    const body = await context.request.json();
    projectData = projectUpdateSchema.parse(body);
  } catch (error) {
    return new Response(JSON.stringify({ error: "Bad Request: Malformed JSON." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 3. Call the service to update the project
  const supabase = createSupabaseServer({ cookies: context.cookies, headers: context.request.headers });
  try {
    const projectService = new ProjectService(supabase);
    const updatedProject = await projectService.updateProject(validatedId, user.id, projectData);
    return new Response(JSON.stringify(updatedProject), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof ProjectNotFoundError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (error instanceof AuthorizationError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.error("Error updating project:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * @description
 * Delete a project
 */
export async function DELETE(context: APIContext): Promise<Response> {
  const { user } = context.locals;
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const validationResult = idSchema.safeParse(context.params.id);

  if (!validationResult.success) {
    return new Response(JSON.stringify({ error: "Invalid project ID format." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const validatedId = validationResult.data;
  const supabase = createSupabaseServer({ cookies: context.cookies, headers: context.request.headers });

  try {
    const projectService = new ProjectService(supabase);
    await projectService.deleteProject(validatedId, user.id);
    return new Response(null, {
      status: 204, // No Content
    });
  } catch (error) {
    if (error instanceof ProjectNotFoundError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    // Catch any unexpected errors from the service call itself
    console.error("Error deleting project:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
