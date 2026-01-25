import type { APIRoute } from "astro";
import { createSupabaseServer } from "@/db/supabase.client";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  const supabase = createSupabaseServer({ cookies, headers: request.headers, locals });
  const { error } = await supabase.auth.signOut();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }

  // A redirect can also be handled client-side, but doing it
  // server-side ensures the session is cleared before the user
  // navigates away. However, since the client will redirect
  // on response.ok, we can just return a 200.
  return new Response(null, { status: 200 });
};
