import type { APIRoute } from "astro";
import { createSupabaseServer } from "@/db/supabase.client";
import { RegisterSchema } from "@/lib/schemas/auth.schemas";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const body = await request.json();
  const validation = RegisterSchema.safeParse(body);

  if (!validation.success) {
    const error = validation.error.flatten().fieldErrors;
    return new Response(
      JSON.stringify({
        error: error.email?.[0] || error.password?.[0] || error.confirmPassword?.[0] || "Invalid input.",
      }),
      { status: 400 }
    );
  }

  const { email, password } = validation.data;
  const supabase = createSupabaseServer({ cookies, headers: request.headers });

  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      // 409 Conflict is more appropriate for a user that already exists.
      status: error.status === 400 ? 409 : error.status || 500,
    });
  }

  return new Response(null, { status: 200 });
};
