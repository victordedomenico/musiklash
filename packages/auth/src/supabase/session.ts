import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type SupabaseEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

export async function updateSupabaseSession(request: NextRequest, env: SupabaseEnv) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  await supabase.auth.getUser();

  return response;
}
