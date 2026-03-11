"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "./auth-provider";
import { cardClass, SectionIntro } from "./project-shell";

export function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { authRequired, loading, signInWithOtp, user } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nextPath = searchParams.get("next") || "/";

  useEffect(() => {
    if (!loading && user && authRequired) {
      router.replace(nextPath);
    }
  }, [authRequired, loading, nextPath, router, user]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);
    setError(null);

    try {
      await signInWithOtp(email);
      setStatus("Magic link sent. Open the email and return here to finish signing in.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to start sign in");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-ink/60">Checking session...</p>;
  }

  if (!authRequired) {
    return (
      <main className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className={cardClass}>
          <SectionIntro
            eyebrow="Development Mode"
            title="Supabase Auth is not required here"
            description="The app is currently using the development auth fallback. You can continue straight into the companion app."
          />
          <div className="mt-6">
            <Link
              className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition hover:bg-forest"
              href={nextPath}
            >
              Continue
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <section className={cardClass}>
        <SectionIntro
          eyebrow="Sign In"
          title="Use Supabase Auth to enter EvalGate"
          description="This flow uses a magic link. After you click the email link, return to EvalGate and the app will continue to the requested page."
        />

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm font-medium text-ink">
            Work email
            <input
              className="rounded-2xl border border-ink/10 bg-sand px-4 py-3 text-sm outline-none ring-signal transition focus:ring-2"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              type="email"
              value={email}
            />
          </label>

          <button
            className="w-fit rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition hover:bg-forest disabled:opacity-60"
            disabled={submitting || email.trim().length < 3}
            type="submit"
          >
            {submitting ? "Sending..." : "Send magic link"}
          </button>

          {status ? <p className="text-sm text-forest">{status}</p> : null}
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
        </form>
      </section>

      <section className={cardClass}>
        <SectionIntro
          eyebrow="Why"
          title="Project data is now user-scoped"
          description="EvalGate now enforces project ownership at the API layer. A valid session is required to browse projects, start runs, and manage CI tokens when Supabase Auth is enabled."
        />
      </section>
    </main>
  );
}
