"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  getDevBrowserUser,
  getSupabaseBrowserClient,
  isDevBrowserAuthEnabled,
  isSupabaseBrowserAuthEnabled
} from "../lib/supabase/browser";

type AuthUser = {
  id: string;
  email: string | null;
};

type AuthContextValue = {
  mode: "supabase" | "dev";
  loading: boolean;
  authRequired: boolean;
  user: AuthUser | null;
  accessToken: string | null;
  signInWithOtp: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function sessionUserToAuthUser(input: { id: string; email?: string | null } | null): AuthUser | null {
  if (!input) {
    return null;
  }

  return {
    id: input.id,
    email: input.email ?? null
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabaseBrowserClient();
  const devAuthEnabled = isDevBrowserAuthEnabled();
  const supabaseEnabled = isSupabaseBrowserAuthEnabled();
  const [loading, setLoading] = useState(supabaseEnabled);
  const [user, setUser] = useState<AuthUser | null>(() =>
    supabaseEnabled ? null : devAuthEnabled ? getDevBrowserUser() : null
  );
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setUser(devAuthEnabled ? getDevBrowserUser() : null);
      setAccessToken(null);
      setLoading(false);
      return;
    }

    const client = supabase;
    let active = true;

    async function hydrate() {
      const { data } = await client.auth.getSession();
      if (!active) {
        return;
      }

      setUser(sessionUserToAuthUser(data.session?.user ?? null));
      setAccessToken(data.session?.access_token ?? null);
      setLoading(false);
    }

    void hydrate();

    const {
      data: { subscription }
    } = client.auth.onAuthStateChange((_event, session) => {
      setUser(sessionUserToAuthUser(session?.user ?? null));
      setAccessToken(session?.access_token ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [devAuthEnabled, supabase]);

  const value = useMemo<AuthContextValue>(
    () => ({
      mode: supabaseEnabled ? "supabase" : "dev",
      loading,
      authRequired: supabaseEnabled,
      user,
      accessToken,
      async signInWithOtp(email: string) {
        if (!supabase) {
          throw new Error("Supabase Auth is not configured");
        }

        const emailRedirectTo =
          typeof window !== "undefined" ? `${window.location.origin}/sign-in` : undefined;
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo
          }
        });
        if (error) {
          throw error;
        }
      },
      async signOut() {
        if (!supabase) {
          return;
        }

        const { error } = await supabase.auth.signOut();
        if (error) {
          throw error;
        }
      }
    }),
    [accessToken, loading, supabase, supabaseEnabled, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { authRequired, loading, user } = useAuth();

  useEffect(() => {
    if (!loading && authRequired && !user) {
      router.replace(`/sign-in?next=${encodeURIComponent(pathname || "/")}`);
    }
  }, [authRequired, loading, pathname, router, user]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-ink/10 bg-white/80 p-6 text-sm text-ink/65 shadow-card backdrop-blur">
        Checking session...
      </div>
    );
  }

  if (authRequired && !user) {
    return (
      <div className="rounded-3xl border border-ink/10 bg-white/80 p-6 text-sm text-ink/65 shadow-card backdrop-blur">
        Redirecting to sign in...
      </div>
    );
  }

  return <>{children}</>;
}
