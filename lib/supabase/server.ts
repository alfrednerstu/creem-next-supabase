import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Server Component / Server Action / Route Handler client. Reads and writes
 * auth cookies through Next's `cookies()` store using the new getAll/setAll
 * Supabase SSR API.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(env.supabaseUrl(), env.supabaseClientKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — Next refuses to mutate cookies.
          // Middleware refreshes the session on every request, so this is
          // safe to ignore.
        }
      },
    },
  });
}

/**
 * Service-role client. Bypasses RLS — ONLY call from trusted server code
 * (webhooks, background jobs, internal server actions after auth checks).
 */
export function createAdminClient() {
  return createAdmin(env.supabaseUrl(), env.supabaseServiceKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
