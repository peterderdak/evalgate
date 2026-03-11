import { createClient } from "@supabase/supabase-js";

export type CurrentUser = {
  id: string;
  email: string;
};

function getBearerToken(request?: Request) {
  const authHeader = request?.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  return token.length > 0 ? token : null;
}

function getSupabaseAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}

function allowDevAuth() {
  const override = process.env.EVALGATE_ALLOW_DEV_AUTH;
  if (override === "true") {
    return true;
  }
  if (override === "false") {
    return false;
  }
  return !getSupabaseAuthClient();
}

function getDevUser(request?: Request): CurrentUser {
  const id =
    request?.headers.get("x-evalgate-user-id") ??
    process.env.EVALGATE_DEV_USER_ID ??
    "00000000-0000-0000-0000-000000000001";
  const email =
    request?.headers.get("x-evalgate-user-email") ??
    process.env.EVALGATE_DEV_USER_EMAIL ??
    "demo@evalgate.local";

  return { id, email };
}

async function getSupabaseUser(accessToken: string): Promise<CurrentUser | null> {
  const supabase = getSupabaseAuthClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user?.id || !data.user.email) {
    return null;
  }

  return {
    id: data.user.id,
    email: data.user.email
  };
}

export async function getCurrentUser(request?: Request): Promise<CurrentUser | null> {
  const accessToken = getBearerToken(request);
  if (accessToken) {
    return getSupabaseUser(accessToken);
  }

  if (allowDevAuth()) {
    return getDevUser(request);
  }

  return null;
}
