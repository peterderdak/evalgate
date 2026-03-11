import "./globals.css";

import type { Metadata } from "next";
import Link from "next/link";

import { AuthProvider } from "../components/auth-provider";
import { AuthStatus } from "../components/auth-status";

export const metadata: Metadata = {
  title: "EvalGate",
  description: "CLI-first evaluation gates with an optional companion app for reports, projects, and CI setup."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-sand text-ink">
        <AuthProvider>
          <div className="grid-fade min-h-screen">
            <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-10 sm:px-6 lg:px-8">
              <header className="mb-10 flex flex-col gap-4 border-b border-ink/10 pb-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Link className="font-display text-sm uppercase tracking-[0.3em] text-forest/70" href="/">
                    EvalGate
                  </Link>
                  <div className="flex flex-wrap items-center justify-end gap-3">
                    <p className="rounded-full border border-ink/10 bg-white/70 px-4 py-2 text-xs uppercase tracking-[0.2em] text-ink/55">
                      Optional Companion App
                    </p>
                    <AuthStatus />
                  </div>
                </div>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-3xl">
                    <h1 className="font-display text-4xl font-bold sm:text-6xl">Optional browser views for EvalGate runs.</h1>
                    <p className="mt-4 max-w-2xl text-base text-ink/70 sm:text-lg">
                      Run EvalGate from the CLI or CI, then use this companion app to inspect projects, datasets,
                      metrics, and CI wiring in one place.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-ink/10 bg-white/70 px-5 py-4 shadow-card backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Companion stack</p>
                    <p className="mt-2 text-sm text-ink/70">Next.js 14, TypeScript, Tailwind, Node API routes, Supabase</p>
                  </div>
                </div>
              </header>
              {children}
            </div>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
