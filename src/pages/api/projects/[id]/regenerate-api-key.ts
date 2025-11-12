import type { APIContext } from "astro";
import { z } from "zod";
import { projectService } from "@/lib/services/project.service";
import { DEFAULT_USER_ID } from "@/db/supabase.client";
import {
  AuthorizationError,
  ProjectNotFoundError,
} from "@/lib/errors";

export const prerender = false;

const projectIdSchema = z.string().uuid({
  message: "Nieprawidłowy format identyfikatora projektu.",
});

/**
 * @description
 * Regeneruje klucz API dla projektu
 */
export async function POST({ params, locals }: APIContext) {
  const supabase = locals.supabase;
  const userId = DEFAULT_USER_ID;

  const result = projectIdSchema.safeParse(params.id);

  if (!result.success) {
    return new Response(
      JSON.stringify({
        message: result.error.errors[0].message,
      }),
      { status: 400 }
    );
  }

  const projectId = result.data;

  try {
    const data = await projectService.regenerateApiKey(
      projectId,
      userId,
      supabase
    );
    return new Response(JSON.stringify(data), { status: 200 });
  } catch (error) {
    if (error instanceof ProjectNotFoundError) {
      return new Response(JSON.stringify({ message: error.message }), {
        status: 404,
      });
    }
    if (error instanceof AuthorizationError) {
      return new Response(JSON.stringify({ message: error.message }), {
        status: 403,
      });
    }
    console.error(error);
    return new Response(
      JSON.stringify({ message: "Wystąpił wewnętrzny błąd serwera" }),
      {
        status: 500,
      }
    );
  }
}
