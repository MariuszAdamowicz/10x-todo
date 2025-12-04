import { defineMiddleware } from "astro:middleware";
import { createSupabaseServer } from "@/db/supabase.client";

// Public routes that do not require session authentication.
// The root '/' is now a protected route that redirects based on auth state.
const PUBLIC_PATHS = ["/login", "/register", "/api/auth/login", "/api/auth/register", "/api/auth/logout"];

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, request, redirect, cookies } = context;

  // API key authentication takes precedence for API routes.
  const apiKey = request.headers.get("X-API-Key");
  if (url.pathname.startsWith("/api/") && apiKey) {
    const supabase = createSupabaseServer({ cookies, headers: request.headers });
    const { data: project, error } = await supabase
      .from("projects")
      .select("id, user_id")
      .eq("api_key", apiKey)
      .single();

    if (error || !project) {
      return new Response(JSON.stringify({ message: "Unauthorized: Invalid API Key" }), {
        status: 401,
      });
    }

    context.locals.user = { id: project.user_id };
    return next();
  }

  // Session-based authentication for all other routes.
  const supabase = createSupabaseServer({ cookies, headers: request.headers });
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
