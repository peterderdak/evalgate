"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { Project } from "@evalgate/shared";

import { createProject, getProjects } from "../lib/api-client";
import { useAuth } from "./auth-provider";
import { cardClass, formatDate, SectionIntro } from "./project-shell";

const templateOptions = [
  { value: "custom", label: "Custom" },
  { value: "ticket_triage_classifier", label: "Ticket triage classifier" },
  { value: "structured_extraction", label: "Structured extraction" }
];

export function ProjectsHome() {
  const router = useRouter();
  const { authRequired, loading: authLoading, user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("Support Ticket Classifier");
  const [description, setDescription] = useState("Regression tests for ticket routing and classification prompts.");
  const [templateType, setTemplateType] = useState("ticket_triage_classifier");

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (authRequired && !user) {
      setProjects([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const next = await getProjects();
        if (!cancelled) {
          setProjects(next);
          setError(null);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Unable to load projects");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [authLoading, authRequired, user]);

  async function handleCreateProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (authRequired && !user) {
      router.push("/sign-in");
      return;
    }

    setCreating(true);
    setError(null);
    setStatus(null);

    try {
      const project = await createProject({
        name: projectName,
        description,
        templateType
      });
      setStatus(`Project created: ${project.name}`);
      router.push(`/projects/${project.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create project");
    } finally {
      setCreating(false);
    }
  }

  if (authLoading) {
    return <p className="text-sm text-ink/60">Checking session...</p>;
  }

  return (
    <main className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="grid gap-6">
        {authRequired && !user ? (
          <div className={cardClass}>
            <SectionIntro
              eyebrow="Sign In"
              title="Use Supabase Auth to enter EvalGate"
              description="Project creation, datasets, runs, and reports are now scoped to the signed-in user."
            />

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link
                className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition hover:bg-forest"
                href="/sign-in"
              >
                Go to sign in
              </Link>
              <p className="text-sm text-ink/65">
                After sign-in, this page will load your projects and let you create new ones.
              </p>
            </div>
          </div>
        ) : (
          <div className={cardClass}>
            <SectionIntro
              eyebrow="Create Project"
              title="Start an evaluation project"
              description="Create the project first, then attach datasets, run configs, and CI gates inside the optional companion app."
            />

            <form className="mt-6 grid gap-4" onSubmit={handleCreateProject}>
              <label className="grid gap-2 text-sm font-medium text-ink">
                Project name
                <input
                  className="rounded-2xl border border-ink/10 bg-sand px-4 py-3 text-sm outline-none ring-signal transition focus:ring-2"
                  onChange={(event) => setProjectName(event.target.value)}
                  placeholder="Support Ticket Classifier"
                  value={projectName}
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-ink">
                Description
                <textarea
                  className="min-h-28 rounded-2xl border border-ink/10 bg-sand px-4 py-3 text-sm outline-none ring-signal transition focus:ring-2"
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Describe the prompt or model behavior being evaluated"
                  value={description}
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-ink">
                Template type
                <select
                  className="rounded-2xl border border-ink/10 bg-sand px-4 py-3 text-sm outline-none ring-signal transition focus:ring-2"
                  onChange={(event) => setTemplateType(event.target.value)}
                  value={templateType}
                >
                  {templateOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <button
                className="w-fit rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition hover:bg-forest disabled:opacity-60"
                disabled={creating}
                type="submit"
              >
                {creating ? "Creating..." : "Create project"}
              </button>

              {status ? <p className="text-sm text-forest">{status}</p> : null}
              {error ? <p className="text-sm text-red-700">{error}</p> : null}
            </form>
          </div>
        )}

        <div className={[cardClass, "bg-mist/55"].join(" ")}>
          <SectionIntro
            eyebrow="MVP Flow"
            title="What the companion app supports"
            description="Create a project, upload a JSONL dataset, define the structured output schema and thresholds, launch a run, and inspect report.json from the run detail page."
          />
          <ul className="mt-5 grid gap-3 text-sm text-ink/70">
            <li>Projects are the top-level container for datasets, run configs, and CI settings.</li>
            <li>Datasets accept `.jsonl` only and should follow the `input` plus `expected` testcase shape.</li>
            <li>Manual runs use a per-run provider API key and queue execution through the worker path.</li>
          </ul>
        </div>
      </section>

      <section className="grid gap-6">
        <div className={cardClass}>
          <SectionIntro
            eyebrow="Projects"
            title="Existing projects"
            description="Select a project to manage datasets, run configs, active runs, and CI wiring."
          />

          {loading ? (
            <p className="mt-6 text-sm text-ink/60">Loading projects...</p>
          ) : projects.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-ink/15 bg-sand/70 p-6 text-sm text-ink/65">
              {authRequired && !user
                ? "Sign in first, then your projects will appear here."
                : "No projects yet. Create one from the panel on the left to start the EvalGate flow."}
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              {projects.map((project) => (
                <Link
                  className="rounded-3xl border border-ink/10 bg-sand/70 p-5 transition hover:-translate-y-0.5 hover:border-forest/30 hover:bg-white"
                  href={`/projects/${project.id}`}
                  key={project.id}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-forest/60">{project.templateType}</p>
                      <h3 className="mt-2 text-lg font-semibold text-ink">{project.name}</h3>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">{project.description}</p>
                    </div>
                    <span className="rounded-full border border-ink/10 bg-white px-3 py-1 text-xs font-medium text-ink/60">
                      Updated {formatDate(project.updatedAt)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
