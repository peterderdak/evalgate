"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from "react";

import type { Run } from "@evalgate/shared";

import { getProjectWorkspace, type ProjectWorkspaceResponse } from "../lib/api-client";

export const cardClass =
  "rounded-3xl border border-ink/10 bg-white/80 p-6 shadow-card backdrop-blur transition";

const navItems = [
  { label: "Overview", href: "" },
  { label: "Datasets", href: "/datasets" },
  { label: "Run Configs", href: "/run-configs" },
  { label: "Runs", href: "/runs" },
  { label: "CI", href: "/ci" }
];

type ProjectDataContextValue = {
  projectId: string;
  data: ProjectWorkspaceResponse | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const ProjectDataContext = createContext<ProjectDataContextValue | null>(null);

function ProjectDataProvider({ projectId, children }: { projectId: string; children: ReactNode }) {
  const [data, setData] = useState<ProjectWorkspaceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (showLoading: boolean) => {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const next = await getProjectWorkspace(projectId);
      setData(next);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load project data");
    } finally {
      if (showLoading) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      setLoading(true);

      try {
        const next = await getProjectWorkspace(projectId);
        if (cancelled) {
          return;
        }
        setData(next);
        setError(null);
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Unable to load project data");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const refresh = useCallback(async () => {
    await load(false);
  }, [load]);

  return (
    <ProjectDataContext.Provider
      value={{
        projectId,
        data,
        loading,
        refreshing,
        error,
        refresh
      }}
    >
      {children}
    </ProjectDataContext.Provider>
  );
}

export function useProjectData() {
  const context = useContext(ProjectDataContext);
  if (!context) {
    throw new Error("useProjectData must be used within a ProjectShell");
  }
  return context;
}

export function ProjectShell({ projectId, children }: { projectId: string; children: ReactNode }) {
  return (
    <ProjectDataProvider projectId={projectId}>
      <ProjectChrome projectId={projectId}>{children}</ProjectChrome>
    </ProjectDataProvider>
  );
}

function ProjectChrome({ projectId, children }: { projectId: string; children: ReactNode }) {
  const pathname = usePathname();
  const { data, loading, refreshing, error, refresh } = useProjectData();

  return (
    <section className="grid gap-6">
      <div className={cardClass}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.22em] text-forest/60">
              {loading && !data ? "Loading project" : data?.project.templateType ?? "EvalGate project"}
            </p>
            <div>
              <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
                {data?.project.name ?? "Project"}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65">
                {data?.project.description ?? "Optional companion view for this EvalGate project."}
              </p>
            </div>
          </div>

          <div className="grid gap-3 rounded-3xl border border-ink/10 bg-sand/80 p-4 text-sm text-ink/65 sm:min-w-[250px]">
            <div className="flex items-center justify-between gap-4">
              <span>Datasets</span>
              <strong className="text-ink">{data?.datasets.length ?? 0}</strong>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Run configs</span>
              <strong className="text-ink">{data?.runConfigs.length ?? 0}</strong>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Runs</span>
              <strong className="text-ink">{data?.runs.length ?? 0}</strong>
            </div>
            <button
              className="rounded-full border border-ink/15 px-4 py-2 text-left font-medium text-ink transition hover:border-forest hover:text-forest disabled:opacity-60"
              disabled={loading || refreshing}
              onClick={() => void refresh()}
              type="button"
            >
              {refreshing ? "Refreshing..." : "Refresh data"}
            </button>
          </div>
        </div>

        <nav className="mt-6 flex flex-wrap gap-3">
          {navItems.map((item) => {
            const href = `/projects/${projectId}${item.href}`;
            const active = pathname === href || (item.href !== "" && pathname.startsWith(`${href}/`));

            return (
              <Link
                className={[
                  "rounded-full px-4 py-2 text-sm font-medium transition",
                  active ? "bg-ink text-white" : "border border-ink/10 bg-white text-ink/65 hover:border-forest hover:text-forest"
                ].join(" ")}
                href={href}
                key={item.label}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {error ? (
        <div className={[cardClass, "border-red-200 bg-red-50/80 text-red-700"].join(" ")}>
          <p className="text-sm font-medium">Project load failed</p>
          <p className="mt-2 text-sm">{error}</p>
        </div>
      ) : null}

      {children}
    </section>
  );
}

export function SectionIntro({
  eyebrow,
  title,
  description,
  aside
}: {
  eyebrow: string;
  title: string;
  description: string;
  aside?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-forest/60">{eyebrow}</p>
        <h3 className="mt-2 font-display text-2xl font-semibold text-ink">{title}</h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65">{description}</p>
      </div>
      {aside}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className={[cardClass, "border-dashed bg-mist/45"].join(" ")}>
      <p className="text-base font-semibold text-ink">{title}</p>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function StatusPill({ status }: { status: Run["status"] | "pass" | "fail" }) {
  const classes =
    status === "completed" || status === "pass"
      ? "bg-emerald-100 text-emerald-800"
      : status === "running"
        ? "bg-amber-100 text-amber-800"
        : status === "queued"
          ? "bg-blue-100 text-blue-800"
          : "bg-red-100 text-red-700";

  return (
    <span className={["rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.14em]", classes].join(" ")}>
      {status}
    </span>
  );
}

export function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-3xl border border-ink/10 bg-white p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-ink/50">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-ink">{value}</p>
      {hint ? <p className="mt-2 text-sm text-ink/55">{hint}</p> : null}
    </div>
  );
}

export function JsonPreview({ value }: { value: unknown }) {
  return (
    <pre className="overflow-x-auto rounded-3xl border border-ink/10 bg-ink p-4 text-xs leading-6 text-mist">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function formatDate(value?: string) {
  if (!value) {
    return "n/a";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export function formatPercent(value?: number | null) {
  if (value === null || value === undefined) {
    return "n/a";
  }

  return `${(value * 100).toFixed(1)}%`;
}

export function formatLatency(value?: number | null) {
  if (value === null || value === undefined) {
    return "n/a";
  }

  return `${Math.round(value)} ms`;
}

export function prettyJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}
