import type { APIRoute } from "astro";
import { createSupabaseServer } from "@/db/supabase.client";
import { LoginSchema } from "@/lib/schemas/auth.schemas";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  const body = await request.json();
  const validation = LoginSchema.safeParse(body);

  if (!validation.success) {
    return new Response(JSON.stringify({ error: "Invalid email or password format." }), { status: 400 });
  }

  const { email, password } = validation.data;
  const supabase = createSupabaseServer({ cookies, headers: request.headers, locals });

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 401,
    });
  }

  return new Response(null, { status: 200 });
};
