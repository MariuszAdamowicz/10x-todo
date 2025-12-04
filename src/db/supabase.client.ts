import type { AstroCookies } from "astro";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import type { Database } from "./database.types";

export const cookieOptions: CookieOptionsWithName = {
  path: "/",
  secure: import.meta.env.PROD, // set to true in production
  httpOnly: true,
  sameSite: "lax",
};

/**
 * A helper function to correctly parse the cookie header on the server.
 * NOTE: This is required due to how Astro handles cookies in middleware/API routes.
 * It might not be needed in future versions of `@supabase/ssr` or Astro.
 * @param cookieHeader The raw 'Cookie' header string.
 * @returns An array of { name, value } objects.
 */
function parseCookieHeader(cookieHeader: string | null): { name: string; value: string }[] {
  if (!cookieHeader) {
    return [];
  }
  return cookieHeader.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    return { name, value: rest.join("=") };
  });
}

/**
 * Creates a Supabase client for server-side operations (API routes, middleware).
 * This client is essential for Server-Side Rendering (SSR) and protecting routes.
 * It correctly handles cookies for authentication state management.
 *
 * @param context An object containing Astro's `cookies` and `headers` objects.
 * @returns A Supabase server client instance.
 */
export const createSupabaseServer = (context: { cookies: AstroCookies; headers: Headers }) => {
  return createServerClient<Database>(import.meta.env.SUPABASE_URL, import.meta.env.SUPABASE_ANON_KEY, {
    cookieOptions,
    cookies: {
      // The `getAll` method is used to read all cookies from the request.
      getAll() {
        return parseCookieHeader(context.headers.get("Cookie"));
      },
      // The `setAll` method is used to set cookies in the response.
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => context.cookies.set(name, value, options));
      },
    },
  });
};

export type SupabaseClient = ReturnType<typeof createSupabaseServer>;
