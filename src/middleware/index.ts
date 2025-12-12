import { defineMiddleware } from "astro:middleware";
import { createSupabaseServer } from "@/db/supabase.client";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";

// Public routes that do not require session authentication.
const PUBLIC_PATHS = ["/login", "/register", "/api/auth/login", "/api/auth/register", "/api/auth/logout"];

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, request, redirect, cookies } = context;

  // This client is for user session management and is scoped to the user.
  const supabase = createSupabaseServer({ cookies, headers: request.headers });
  context.locals.supabase = supabase;

  // API key authentication takes precedence for API routes.
  const apiKey = request.headers.get("X-API-Key");
  if (url.pathname.startsWith("/api/") && apiKey) {
    // This admin client bypasses RLS to look up the project by API key.
    // It should only be used for this purpose.
    const supabaseAdmin = createClient<Database>(
      import.meta.env.SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: project, error } = await supabaseAdmin
      .from("projects")
      .select("id, user_id")
      .eq("api_key", apiKey)
      .single();

    if (error || !project) {
      return new Response(JSON.stringify({ message: "Unauthorized: Invalid API Key" }), {
        status: 401,
      });
    }

    // Attach the project and owner info to locals for use in API endpoints.
    context.locals.user = { id: project.user_id };
    context.locals.aiProjectId = project.id;
    return next();
  }

  // Session-based authentication for all other routes.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  context.locals.user = user ? { id: user.id, email: user.email } : null;

  // Handle root path redirection separately
  if (url.pathname === "/") {
    return user ? redirect("/projects", 302) : redirect("/login", 302);
  }

  // Handle redirections for other paths
  if (user) {
    // If logged in, redirect from auth pages to the main app.
    if (url.pathname === "/login" || url.pathname === "/register") {
      return redirect("/projects", 302);
    }
  } else {
    // If not logged in, protect non-public routes.
    if (!PUBLIC_PATHS.includes(url.pathname)) {
      // Exception for API routes that are not auth-related and weren't caught by API key auth.
      // These should be protected and return a 401, not redirect.
      if (url.pathname.startsWith("/api/")) {
        return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
      }
      return redirect("/login", 302);
    }
  }

  return next();
});
