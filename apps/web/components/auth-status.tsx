"use client";

import Link from "next/link";
import { useState } from "react";

import { useAuth } from "./auth-provider";

export function AuthStatus() {
  const { authRequired, loading, mode, signOut, user } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    setSigningOut(true);
    setError(null);

    try {
      await signOut();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign out");
    } finally {
      setSigningOut(false);
    }
  }

  if (loading) {
    return (
      <p className="rounded-full border border-ink/10 bg-white/70 px-4 py-2 text-xs uppercase tracking-[0.2em] text-ink/55">
        Checking session
      </p>
    );
  }

  if (!authRequired && mode === "dev") {
    return (
      <div className="flex flex-wrap items-center justify-end gap-3">
        <p className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs uppercase tracking-[0.2em] text-emerald-800">
          Dev auth enabled
        </p>
        <p className="rounded-full border border-ink/10 bg-white/70 px-4 py-2 text-xs uppercase tracking-[0.2em] text-ink/55">
          {user?.email ?? "development user"}
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <Link
        className="rounded-full border border-ink/10 bg-white/70 px-4 py-2 text-xs uppercase tracking-[0.2em] text-ink/55 transition hover:border-forest hover:text-forest"
        href="/sign-in"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <p className="rounded-full border border-ink/10 bg-white/70 px-4 py-2 text-xs uppercase tracking-[0.2em] text-ink/55">
          {user.email ?? "signed in"}
        </p>
        <button
          className="rounded-full border border-ink/10 bg-white/70 px-4 py-2 text-xs uppercase tracking-[0.2em] text-ink/55 transition hover:border-forest hover:text-forest disabled:opacity-60"
          disabled={signingOut}
          onClick={() => void handleSignOut()}
          type="button"
        >
          {signingOut ? "Signing out..." : "Sign out"}
        </button>
      </div>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
