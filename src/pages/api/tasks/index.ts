import type { APIRoute } from "astro";
import { GetTasksQuerySchema, TaskCreateSchema } from "@/lib/schemas/task.schemas";
import { TaskService } from "@/lib/services/task.service";
import type { TaskCreateCommand } from "@/types";
import { AuthorizationError, TaskNotFoundError } from "@/lib/errors";

export const prerender = false;

export const GET: APIRoute = async ({ url, locals }) => {
  const { user, supabase, aiProjectId } = locals;

  if (!user?.id) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
  }

  try {
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validation = GetTasksQuerySchema.safeParse(queryParams);

    if (!validation.success) {
      return new Response(
        JSON.stringify({
          message: "Validation failed",
          errors: validation.error.flatten().fieldErrors,
        }),
        { status: 400 }
      );
    }

    const { page, limit, ...filters } = validation.data;
    const auth = { userId: user.id, aiProjectId };

    // If AI is making the request, ensure the projectId filter matches the one from the API key
    if (aiProjectId) {
      filters.projectId = aiProjectId;
    }

    const taskService = new TaskService(supabase);
    const { data, count } = await taskService.getTasks({
      filters,
      pagination: { page, limit },
      auth,
    });

    const totalPages = Math.ceil(count / limit);

    return new Response(
      JSON.stringify({
        data,
        pagination: {
          page,
          limit,
          total: count,
          totalPages,
        },
      }),
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof TaskNotFoundError) {
      return new Response(JSON.stringify({ message: error.message }), {
        status: 404,
      });
    }
    if (error instanceof AuthorizationError) {
      return new Response(JSON.stringify({ message: error.message }), {
        status: 403,
      });
    }
    console.error("Error getting tasks:", error);
    return new Response(JSON.stringify({ message: "Internal Server Error" }), {
      status: 500,
    });
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const { user, supabase, aiProjectId } = locals;

  // For both users and AI, an authenticated identity is required.
  if (!user?.id && !aiProjectId) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = TaskCreateSchema.safeParse(body);

    if (!validation.success) {
      return new Response(
        JSON.stringify({
          message: "Validation failed",
          errors: validation.error.flatten().fieldErrors,
        }),
        { status: 400 }
      );
    }

    const command: TaskCreateCommand = validation.data;
    const auth: { userId?: string; projectId?: string } = {};

    if (aiProjectId) {
      auth.projectId = aiProjectId;
    } else if (user?.id) {
      auth.userId = user.id;
    }

    const taskService = new TaskService(supabase);
    const newTask = await taskService.createTask(command, auth);

    return new Response(JSON.stringify(newTask), { status: 201 });
  } catch (error) {
    if (error instanceof TaskNotFoundError) {
      return new Response(JSON.stringify({ message: error.message }), {
        status: 404,
      });
    }
    if (error instanceof AuthorizationError) {
      return new Response(JSON.stringify({ message: error.message }), {
        status: 403,
      });
    }
    if (error instanceof Error && error.message.includes("is required")) {
      return new Response(JSON.stringify({ message: error.message }), { status: 400 });
    }
    console.error("Error creating task:", error);
    return new Response(JSON.stringify({ message: "Internal Server Error" }), {
      status: 500,
    });
  }
};
