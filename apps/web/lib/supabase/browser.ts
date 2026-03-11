import { createClient } from "@supabase/supabase-js";

let browserClient: ReturnType<typeof createClient> | null = null;

export function isSupabaseBrowserAuthEnabled() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getDevBrowserUser() {
  return {
    id:
      process.env.NEXT_PUBLIC_EVALGATE_DEV_USER_ID ??
      "00000000-0000-0000-0000-000000000001",
    email: process.env.NEXT_PUBLIC_EVALGATE_DEV_USER_EMAIL ?? "demo@evalgate.local"
  };
}

export function isDevBrowserAuthEnabled() {
  const override = process.env.NEXT_PUBLIC_EVALGATE_ALLOW_DEV_AUTH;
  if (override === "true") {
    return true;
  }
  if (override === "false") {
    return false;
  }
  return !isSupabaseBrowserAuthEnabled();
}

export function getSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }

  return browserClient;
}
