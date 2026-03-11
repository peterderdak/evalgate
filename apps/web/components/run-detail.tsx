"use client";

import { useEffect, useState } from "react";

import type { FailureRecord, RunReport } from "@evalgate/shared";

import { getRunFailures, getRunReport, getRunStatus, type RunStatusResponse } from "../lib/api-client";
import {
  cardClass,
  EmptyState,
  formatDate,
  formatLatency,
  formatPercent,
  JsonPreview,
  MetricCard,
  SectionIntro,
  StatusPill,
  useProjectData
} from "./project-shell";

export function RunDetail({ runId }: { runId: string }) {
  const { data, loading: projectLoading, refresh } = useProjectData();
  const [runStatus, setRunStatus] = useState<RunStatusResponse | null>(null);
  const [report, setReport] = useState<RunReport | null>(null);
  const [failures, setFailures] = useState<FailureRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    setLoading(true);
    setRunStatus(null);
    setReport(null);
    setFailures([]);
    setError(null);

    async function load() {
      try {
        const nextStatus = await getRunStatus(runId);
        if (cancelled) {
          return;
        }

        setRunStatus(nextStatus);
        await refresh().catch(() => undefined);

        if (nextStatus.status === "completed") {
          const [nextReport, nextFailures] = await Promise.all([getRunReport(runId), getRunFailures(runId)]);
          if (!cancelled) {
            setReport(nextReport);
            setFailures(nextFailures);
          }
        } else if (nextStatus.status === "queued" || nextStatus.status === "running") {
          timer = setTimeout(() => {
            void load();
          }, 2500);
        }

        if (!cancelled) {
          setError(null);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Unable to load run detail");
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
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [refresh, runId]);

  if (loading && projectLoading && !data && !runStatus) {
    return <p className="text-sm text-ink/60">Loading run detail...</p>;
  }

  if (!data) {
    return <EmptyState title="Project unavailable" body="The project workspace could not be loaded for this run." />;
  }

  const run = data.runs.find((candidate) => candidate.id === runId);
  const dataset = run ? data.datasets.find((candidate) => candidate.id === run.datasetId) : null;
  const runConfig = run ? data.runConfigs.find((candidate) => candidate.id === run.runConfigId) : null;
  const activeStatus = runStatus?.status ?? run?.status ?? "queued";

  return (
    <div className="grid gap-6">
      <div className={cardClass}>
        <SectionIntro
          eyebrow="Run Detail"
          title={runConfig?.name ?? runId}
          description="Polls the run status route until a report is available, then renders metrics, gate reasons, and failure examples."
          aside={<StatusPill status={report ? (report.pass ? "pass" : "fail") : activeStatus} />}
        />

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Run ID" value={runId} hint={run?.triggerSource ?? "manual"} />
          <MetricCard label="Dataset" value={dataset?.filename ?? run?.datasetId ?? "n/a"} hint={`${runStatus?.processedCases ?? run?.processedCases ?? 0}/${runStatus?.totalCases ?? run?.totalCases ?? 0} cases`} />
          <MetricCard label="Started" value={formatDate(run?.startedAt ?? run?.createdAt)} hint={`Created ${formatDate(run?.createdAt)}`} />
          <MetricCard label="Completed" value={formatDate(run?.completedAt)} hint={run?.status === "failed" ? "Run failed before report completion" : "Wait for report persistence"} />
        </div>

        {error ? <p className="mt-5 text-sm text-red-700">{error}</p> : null}
        {run?.errorMessage ? <p className="mt-3 text-sm text-red-700">Run error: {run.errorMessage}</p> : null}
      </div>

      {activeStatus === "queued" || activeStatus === "running" ? (
        <div className={[cardClass, "bg-mist/55"].join(" ")}>
          <p className="text-sm font-medium text-ink">Run in progress</p>
          <p className="mt-2 text-sm text-ink/65">
            {runStatus?.processedCases ?? run?.processedCases ?? 0} of {runStatus?.totalCases ?? run?.totalCases ?? 0} cases
            processed.
          </p>
        </div>
      ) : null}

      {report ? (
        <>
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className={cardClass}>
              <SectionIntro
                eyebrow="Metrics"
                title="Gate-relevant summary"
                description="These deterministic metrics are generated from the persisted report.json artifact."
              />

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <MetricCard label="schema_valid_rate" value={formatPercent(report.metrics.schema_valid_rate)} />
                <MetricCard label="enum_accuracy" value={formatPercent(report.metrics.enum_accuracy)} />
                <MetricCard label="field_level_accuracy" value={formatPercent(report.metrics.field_level_accuracy)} />
                <MetricCard label="latency_p95_ms" value={formatLatency(report.metrics.latency_p95_ms)} />
              </div>
            </div>

            <div className={cardClass}>
              <SectionIntro
                eyebrow="Summary"
                title={report.pass ? "Gate passed" : "Gate failed"}
                description="A run only passes when every configured threshold is satisfied."
              />

              <div className="mt-6 grid gap-4 text-sm text-ink/70">
                <div className="rounded-3xl border border-ink/10 bg-sand/70 p-5">
                  <p>Total cases: {report.summary.total_cases}</p>
                  <p className="mt-2">Passed cases: {report.summary.passed_cases}</p>
                  <p className="mt-2">Failed cases: {report.summary.failed_cases}</p>
                </div>

                <div className="rounded-3xl border border-ink/10 bg-sand/70 p-5">
                  <p className="font-medium text-ink">Gate reasons</p>
                  {report.gate_reasons.length === 0 ? (
                    <p className="mt-2">All thresholds passed.</p>
                  ) : (
                    <div className="mt-3 grid gap-3">
                      {report.gate_reasons.map((reason) => (
                        <div className="rounded-2xl border border-ink/10 bg-white px-4 py-3" key={`${reason.metric}-${reason.threshold}`}>
                          <p className="text-sm font-medium text-ink">{reason.metric}</p>
                          <p className="mt-2 text-xs text-ink/60">
                            actual {reason.actual} {reason.operator === ">=" ? "<" : ">"} threshold {reason.threshold}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <a
                  className="w-fit rounded-full border border-ink/15 px-4 py-2 font-medium text-ink transition hover:border-forest hover:text-forest"
                  href={`/api/runs/${runId}/report`}
                  target="_blank"
                >
                  Download report.json
                </a>
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <div className={cardClass}>
              <SectionIntro
                eyebrow="Failures"
                title="Top failure examples"
                description="Each failure includes the testcase id, failure taxonomy, raw input, expected output, and the actual parsed model response."
              />

              {failures.length === 0 ? (
                <div className="mt-6 rounded-3xl border border-dashed border-ink/15 bg-mist/45 p-6 text-sm text-ink/65">
                  No failures were recorded for this run.
                </div>
              ) : (
                <div className="mt-6 grid gap-4">
                  {failures.map((failure) => (
                    <div className="rounded-3xl border border-ink/10 bg-sand/70 p-5" key={failure.id}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-forest/60">{failure.failureType}</p>
                          <h3 className="mt-2 text-lg font-semibold text-ink">{failure.testcaseId}</h3>
                        </div>
                        <span className="rounded-full border border-ink/10 bg-white px-3 py-1 text-xs font-medium text-ink/60">
                          {formatLatency(failure.latencyMs)}
                        </span>
                      </div>
                      <div className="mt-4 grid gap-4 lg:grid-cols-3">
                        <div>
                          <p className="mb-2 text-xs uppercase tracking-[0.14em] text-ink/45">Input</p>
                          <JsonPreview value={failure.input} />
                        </div>
                        <div>
                          <p className="mb-2 text-xs uppercase tracking-[0.14em] text-ink/45">Expected</p>
                          <JsonPreview value={failure.expected} />
                        </div>
                        <div>
                          <p className="mb-2 text-xs uppercase tracking-[0.14em] text-ink/45">Actual</p>
                          <JsonPreview value={failure.actual} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={cardClass}>
              <SectionIntro
                eyebrow="Raw Report"
                title="Persisted report.json"
                description="The report artifact is stored via the repository layer and returned directly by the API route."
              />
              <div className="mt-6">
                <JsonPreview value={report} />
              </div>
            </div>
          </div>
        </>
      ) : activeStatus === "failed" ? (
        <EmptyState
          title="Run failed before report generation"
          body={run?.errorMessage ?? "The worker marked this run as failed and no report artifact was produced."}
        />
      ) : null}
    </div>
  );
}
