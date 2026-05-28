import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type SupabaseEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

export async function createServerSupabaseClient(env: SupabaseEnv) {
  const cookieStore = await cookies();

  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — safe to ignore if proxy refreshes sessions.
        }
      },
    },
  });
}
