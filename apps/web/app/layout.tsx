import "./globals.css";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "EvalGate",
  description: "Ship LLM evaluation gates with Next.js, Supabase, and GitHub Actions."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-sand text-ink">
        <div className="grid-fade min-h-screen">
          <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-10 sm:px-6 lg:px-8">
            <header className="mb-10 flex flex-col gap-4 border-b border-ink/10 pb-8">
              <p className="font-display text-sm uppercase tracking-[0.3em] text-forest/70">EvalGate</p>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <h1 className="font-display text-4xl font-bold sm:text-6xl">Evaluation gates for production prompts.</h1>
                  <p className="mt-4 max-w-2xl text-base text-ink/70 sm:text-lg">
                    Upload JSONL datasets, run schema-validated model checks, inspect metrics, and export a
                    GitHub CI gate without leaving the repository.
                  </p>
                </div>
                <div className="rounded-2xl border border-ink/10 bg-white/70 px-5 py-4 shadow-card backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Stack</p>
                  <p className="mt-2 text-sm text-ink/70">Next.js 14, TypeScript, Tailwind, Node API routes, Supabase</p>
                </div>
              </div>
            </header>
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
