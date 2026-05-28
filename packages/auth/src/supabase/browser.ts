import { createBrowserClient } from "@supabase/ssr";

type SupabaseEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

export function createBrowserSupabaseClient(env: SupabaseEnv) {
  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
}
