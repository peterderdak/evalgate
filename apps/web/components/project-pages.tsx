"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { RunSummaryResponse, Thresholds } from "@evalgate/shared";

import { createCiToken, createRunConfig, getCiSummary, startCiRun, startRun, uploadDataset } from "../lib/api-client";
import {
  cardClass,
  EmptyState,
  formatDate,
  formatLatency,
  formatPercent,
  MetricCard,
  prettyJson,
  SectionIntro,
  StatusPill,
  useProjectData
} from "./project-shell";

const sampleSchema = {
  type: "object",
  properties: {
    category: {
      type: "string",
      enum: ["billing", "refund", "cancellation", "technical", "unknown"]
    }
  },
  required: ["category"],
  additionalProperties: false
};

const sampleThresholds: Thresholds = {
  schema_valid_rate_min: 0.95,
  enum_accuracy_min: 0.9,
  field_level_accuracy_min: 0.92,
  latency_p95_max_ms: 2500
};

function sortByDate<T extends { createdAt?: string; uploadedAt?: string }>(items: T[]) {
  return items.slice().sort((left, right) => {
    const leftValue = new Date(left.createdAt ?? left.uploadedAt ?? 0).getTime();
    const rightValue = new Date(right.createdAt ?? right.uploadedAt ?? 0).getTime();
    return rightValue - leftValue;
  });
}

function parseJsonField<T>(label: string, value: string) {
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} must be valid JSON`);
  }
}

function renderThresholdSummary(thresholds: Thresholds) {
  return [
    thresholds.schema_valid_rate_min !== undefined
      ? `schema >= ${formatPercent(thresholds.schema_valid_rate_min)}`
      : null,
    thresholds.enum_accuracy_min !== undefined ? `enum >= ${formatPercent(thresholds.enum_accuracy_min)}` : null,
    thresholds.field_level_accuracy_min !== undefined
      ? `field >= ${formatPercent(thresholds.field_level_accuracy_min)}`
      : null,
    thresholds.latency_p95_max_ms !== undefined ? `p95 <= ${formatLatency(thresholds.latency_p95_max_ms)}` : null
  ]
    .filter(Boolean)
    .join("  •  ");
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function ProjectOverviewPage() {
  const { data, loading } = useProjectData();

  if (loading && !data) {
    return <p className="text-sm text-ink/60">Loading project overview...</p>;
  }

  if (!data) {
    return <EmptyState title="Project unavailable" body="The workspace data could not be loaded for this project." />;
  }

  const latestRun = sortByDate(data.runs)[0];

  return (
    <div className="grid gap-6">
      <div className={cardClass}>
        <SectionIntro
          eyebrow="Overview"
          title="Project summary"
          description="This workspace is the control plane for datasets, structured run configs, run execution, and CI release gates."
        />

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Datasets" value={String(data.datasets.length)} hint="Versioned JSONL uploads" />
          <MetricCard label="Run configs" value={String(data.runConfigs.length)} hint="Prompt + model + schema + thresholds" />
          <MetricCard label="Runs" value={String(data.runs.length)} hint="Queued, running, completed, or failed" />
          <MetricCard label="CI tokens" value={String(data.ciTokens.length)} hint="Stored as hashes for bearer auth" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className={cardClass}>
          <SectionIntro
            eyebrow="Quick Links"
            title="Move through the MVP flow"
            description="The current UI is organized around the same sequence as the technical spec."
          />
          <div className="mt-5 grid gap-3">
            <Link className="rounded-2xl border border-ink/10 bg-sand/70 px-4 py-4 text-sm font-medium text-ink transition hover:border-forest hover:text-forest" href={`/projects/${data.project.id}/datasets`}>
              1. Upload and validate a JSONL dataset
            </Link>
            <Link className="rounded-2xl border border-ink/10 bg-sand/70 px-4 py-4 text-sm font-medium text-ink transition hover:border-forest hover:text-forest" href={`/projects/${data.project.id}/run-configs`}>
              2. Create a structured run config
            </Link>
            <Link className="rounded-2xl border border-ink/10 bg-sand/70 px-4 py-4 text-sm font-medium text-ink transition hover:border-forest hover:text-forest" href={`/projects/${data.project.id}/runs`}>
              3. Start a run and watch status
            </Link>
            <Link className="rounded-2xl border border-ink/10 bg-sand/70 px-4 py-4 text-sm font-medium text-ink transition hover:border-forest hover:text-forest" href={`/projects/${data.project.id}/ci`}>
              4. Export the GitHub CI gate wiring
            </Link>
          </div>
        </div>

        <div className={cardClass}>
          <SectionIntro
            eyebrow="Latest Run"
            title={latestRun ? "Most recent execution" : "No runs yet"}
            description={
              latestRun
                ? "Use the run detail screen to inspect pass/fail, metrics, failure examples, and the raw report."
                : "Create a dataset and run config first, then launch the first evaluation run."
            }
          />

          {latestRun ? (
            <div className="mt-5 grid gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-ink/10 bg-sand/70 p-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-forest/60">{latestRun.triggerSource}</p>
                  <p className="mt-2 text-lg font-semibold text-ink">{latestRun.id}</p>
                  <p className="mt-2 text-sm text-ink/65">
                    Created {formatDate(latestRun.createdAt)} • {latestRun.processedCases}/{latestRun.totalCases ?? 0} cases processed
                  </p>
                </div>
                <StatusPill status={latestRun.status} />
              </div>

              <Link
                className="w-fit rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition hover:bg-forest"
                href={`/projects/${data.project.id}/runs/${latestRun.id}`}
              >
                Open run detail
              </Link>
            </div>
          ) : (
            <EmptyState
              title="No evaluation runs"
              body="Manual and CI-triggered runs will appear here after you create a dataset and a run config."
              action={
                <Link
                  className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition hover:bg-forest"
                  href={`/projects/${data.project.id}/runs`}
                >
                  Go to runs
                </Link>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}

export function ProjectDatasetsPage() {
  const { data, loading, refresh } = useProjectData();
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!data) {
      return;
    }

    const fileInput = event.currentTarget.elements.namedItem("dataset") as HTMLInputElement | null;
    const file = fileInput?.files?.[0];
    if (!file) {
      setError("Select a JSONL file before uploading.");
      return;
    }

    setUploading(true);
    setStatus(null);
    setError(null);

    try {
      const dataset = await uploadDataset(data.project.id, file);
      setStatus(`Uploaded ${dataset.filename} with ${dataset.rowCount} cases.`);
      event.currentTarget.reset();
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to upload dataset");
    } finally {
      setUploading(false);
    }
  }

  if (loading && !data) {
    return <p className="text-sm text-ink/60">Loading datasets...</p>;
  }

  if (!data) {
    return <EmptyState title="Project unavailable" body="The dataset workspace could not be loaded." />;
  }

  const datasets = sortByDate(data.datasets);

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <div className={cardClass}>
        <SectionIntro
          eyebrow="Upload Dataset"
          title="Attach a JSONL test set"
          description="Each line must contain an `input` object and an `expected` structured output. The API validates the file before it is stored."
        />

        <form className="mt-6 grid gap-4" onSubmit={handleUpload}>
          <label className="grid gap-2 text-sm font-medium text-ink">
            Dataset file
            <input
              accept=".jsonl,application/x-ndjson,text/plain"
              className="rounded-2xl border border-dashed border-ink/20 bg-sand/80 px-4 py-5 text-sm"
              name="dataset"
              type="file"
            />
          </label>

          <button
            className="w-fit rounded-full bg-signal px-5 py-3 text-sm font-medium text-white transition hover:bg-amber-700 disabled:opacity-60"
            disabled={uploading}
            type="submit"
          >
            {uploading ? "Uploading..." : "Upload dataset"}
          </button>

          {status ? <p className="text-sm text-forest">{status}</p> : null}
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
        </form>

        <div className="mt-6 rounded-3xl border border-ink/10 bg-ink p-4 text-xs leading-6 text-mist">
          <p>{'{"id":"case_001","input":{"ticket_text":"Customer says they were double charged"},"expected":{"category":"billing"}}'}</p>
          <p className="mt-2">
            {
              '{"id":"case_002","input":{"ticket_text":"Please cancel my subscription immediately"},"expected":{"category":"cancellation"}}'
            }
          </p>
        </div>
      </div>

      <div className={cardClass}>
        <SectionIntro
          eyebrow="Datasets"
          title="Version history"
          description="The worker reads dataset content from storage and replays every case for each run."
        />

        {datasets.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-ink/15 bg-mist/45 p-6 text-sm text-ink/65">
            No datasets uploaded yet.
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            {datasets.map((dataset) => (
              <div className="rounded-3xl border border-ink/10 bg-sand/70 p-5" key={dataset.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-forest/60">Version {dataset.version}</p>
                    <h3 className="mt-2 text-lg font-semibold text-ink">{dataset.filename}</h3>
                    <p className="mt-2 text-sm text-ink/65">
                      {dataset.rowCount} cases • uploaded {formatDate(dataset.uploadedAt)}
                    </p>
                  </div>
                  <span className="rounded-full border border-ink/10 bg-white px-3 py-1 text-xs font-medium text-ink/60">
                    {dataset.id}
                  </span>
                </div>
                <p className="mt-3 break-all text-xs text-ink/45">{dataset.storagePath}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ProjectRunConfigsPage() {
  const { data, loading, refresh } = useProjectData();
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("gpt-4.1-mini-v1");
  const [promptVersion, setPromptVersion] = useState("v1");
  const [modelProvider, setModelProvider] = useState("openai");
  const [modelName, setModelName] = useState("gpt-4.1-mini");
  const [promptText, setPromptText] = useState(
    "Classify the ticket into one of: billing, refund, cancellation, technical, unknown. Return only JSON."
  );
  const [schemaJson, setSchemaJson] = useState(prettyJson(sampleSchema));
  const [thresholdsJson, setThresholdsJson] = useState(prettyJson(sampleThresholds));

  async function handleCreateRunConfig(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!data) {
      return;
    }

    setSaving(true);
    setStatus(null);
    setError(null);

    try {
      const schema = parseJsonField<Record<string, unknown>>("Schema", schemaJson);
      const thresholds = parseJsonField<Thresholds>("Thresholds", thresholdsJson);
      const runConfig = await createRunConfig(data.project.id, {
        name,
        promptText,
        promptVersion,
        modelProvider,
        modelName,
        schema,
        thresholds
      });
      setStatus(`Created run config ${runConfig.name}.`);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create run config");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !data) {
    return <p className="text-sm text-ink/60">Loading run configs...</p>;
  }

  if (!data) {
    return <EmptyState title="Project unavailable" body="The run config workspace could not be loaded." />;
  }

  const runConfigs = sortByDate(data.runConfigs);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <div className={cardClass}>
        <SectionIntro
          eyebrow="Create Run Config"
          title="Define the structured evaluation contract"
          description="A run config bundles prompt text, model selection, output schema, and gate thresholds."
        />

        <form className="mt-6 grid gap-4" onSubmit={handleCreateRunConfig}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-ink">
              Name
              <input
                className="rounded-2xl border border-ink/10 bg-sand px-4 py-3 text-sm outline-none ring-signal transition focus:ring-2"
                onChange={(event) => setName(event.target.value)}
                value={name}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-ink">
              Prompt version
              <input
                className="rounded-2xl border border-ink/10 bg-sand px-4 py-3 text-sm outline-none ring-signal transition focus:ring-2"
                onChange={(event) => setPromptVersion(event.target.value)}
                value={promptVersion}
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-ink">
              Provider
              <select
                className="rounded-2xl border border-ink/10 bg-sand px-4 py-3 text-sm outline-none ring-signal transition focus:ring-2"
                onChange={(event) => setModelProvider(event.target.value)}
                value={modelProvider}
              >
                <option value="openai">openai</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-ink">
              Model
              <input
                className="rounded-2xl border border-ink/10 bg-sand px-4 py-3 text-sm outline-none ring-signal transition focus:ring-2"
                onChange={(event) => setModelName(event.target.value)}
                value={modelName}
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm font-medium text-ink">
            Prompt text
            <textarea
              className="min-h-40 rounded-2xl border border-ink/10 bg-sand px-4 py-3 text-sm outline-none ring-signal transition focus:ring-2"
              onChange={(event) => setPromptText(event.target.value)}
              value={promptText}
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-ink">
            JSON Schema
            <textarea
              className="min-h-56 rounded-2xl border border-ink/10 bg-ink px-4 py-3 font-mono text-xs text-mist outline-none ring-signal transition focus:ring-2"
              onChange={(event) => setSchemaJson(event.target.value)}
              value={schemaJson}
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-ink">
            Thresholds JSON
            <textarea
              className="min-h-44 rounded-2xl border border-ink/10 bg-ink px-4 py-3 font-mono text-xs text-mist outline-none ring-signal transition focus:ring-2"
              onChange={(event) => setThresholdsJson(event.target.value)}
              value={thresholdsJson}
            />
          </label>

          <button
            className="w-fit rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition hover:bg-forest disabled:opacity-60"
            disabled={saving}
            type="submit"
          >
            {saving ? "Saving..." : "Create run config"}
          </button>

          {status ? <p className="text-sm text-forest">{status}</p> : null}
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
        </form>
      </div>

      <div className={cardClass}>
        <SectionIntro
          eyebrow="Run Configs"
          title="Saved evaluation presets"
          description="These presets can be reused for both manual runs and CI-triggered checks."
        />

        {runConfigs.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-ink/15 bg-mist/45 p-6 text-sm text-ink/65">
            No run configs created yet.
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            {runConfigs.map((runConfig) => (
              <div className="rounded-3xl border border-ink/10 bg-sand/70 p-5" key={runConfig.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-forest/60">
                      {runConfig.modelProvider} / {runConfig.modelName}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-ink">{runConfig.name}</h3>
                    <p className="mt-2 text-sm text-ink/65">
                      {runConfig.promptVersion ? `Version ${runConfig.promptVersion} • ` : ""}
                      created {formatDate(runConfig.createdAt)}
                    </p>
                  </div>
                  <span className="rounded-full border border-ink/10 bg-white px-3 py-1 text-xs font-medium text-ink/60">
                    {runConfig.id}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-ink/70">{runConfig.promptText}</p>
                <p className="mt-4 text-xs text-ink/55">{renderThresholdSummary(runConfig.thresholds)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ProjectRunsPage() {
  const router = useRouter();
  const { data, loading, refresh } = useProjectData();
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [datasetId, setDatasetId] = useState("");
  const [runConfigId, setRunConfigId] = useState("");
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    if (!data) {
      return;
    }

    if (!datasetId && data.datasets[0]) {
      setDatasetId(data.datasets[0].id);
    }

    if (!runConfigId && data.runConfigs[0]) {
      setRunConfigId(data.runConfigs[0].id);
    }
  }, [data, datasetId, runConfigId]);

  async function handleStartRun(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!data) {
      return;
    }

    setSubmitting(true);
    setStatus(null);
    setError(null);

    try {
      const run = await startRun(data.project.id, {
        datasetId,
        runConfigId,
        apiKey
      });
      setStatus(`Run queued: ${run.runId}`);
      await refresh();
      router.push(`/projects/${data.project.id}/runs/${run.runId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to start run");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && !data) {
    return <p className="text-sm text-ink/60">Loading runs...</p>;
  }

  if (!data) {
    return <EmptyState title="Project unavailable" body="The run workspace could not be loaded." />;
  }

  const runs = sortByDate(data.runs);
  const datasetsById = new Map(data.datasets.map((dataset) => [dataset.id, dataset]));
  const runConfigsById = new Map(data.runConfigs.map((runConfig) => [runConfig.id, runConfig]));
  const ready = data.datasets.length > 0 && data.runConfigs.length > 0;

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <div className={cardClass}>
        <SectionIntro
          eyebrow="Run Evaluation"
          title="Queue a manual run"
          description="Manual runs accept a per-run provider API key. The backend encrypts the key into the job payload and the worker decrypts it at execution time."
        />

        {!ready ? (
          <div className="mt-6 rounded-3xl border border-dashed border-ink/15 bg-mist/45 p-6 text-sm text-ink/65">
            You need at least one dataset and one run config before starting a run.
          </div>
        ) : (
          <form className="mt-6 grid gap-4" onSubmit={handleStartRun}>
            <label className="grid gap-2 text-sm font-medium text-ink">
              Dataset
              <select
                className="rounded-2xl border border-ink/10 bg-sand px-4 py-3 text-sm outline-none ring-signal transition focus:ring-2"
                onChange={(event) => setDatasetId(event.target.value)}
                value={datasetId}
              >
                {data.datasets.map((dataset) => (
                  <option key={dataset.id} value={dataset.id}>
                    {dataset.filename} ({dataset.rowCount} cases)
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium text-ink">
              Run config
              <select
                className="rounded-2xl border border-ink/10 bg-sand px-4 py-3 text-sm outline-none ring-signal transition focus:ring-2"
                onChange={(event) => setRunConfigId(event.target.value)}
                value={runConfigId}
              >
                {data.runConfigs.map((runConfig) => (
                  <option key={runConfig.id} value={runConfig.id}>
                    {runConfig.name} ({runConfig.modelName})
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium text-ink">
              Provider API key
              <input
                className="rounded-2xl border border-ink/10 bg-sand px-4 py-3 text-sm outline-none ring-signal transition focus:ring-2"
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="sk-..."
                type="password"
                value={apiKey}
              />
            </label>

            <button
              className="w-fit rounded-full bg-forest px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:opacity-60"
              disabled={submitting || !apiKey || !datasetId || !runConfigId}
              type="submit"
            >
              {submitting ? "Queueing..." : "Start run"}
            </button>

            {status ? <p className="text-sm text-forest">{status}</p> : null}
            {error ? <p className="text-sm text-red-700">{error}</p> : null}
          </form>
        )}
      </div>

      <div className={cardClass}>
        <SectionIntro
          eyebrow="Runs"
          title="Execution history"
          description="Queued and running jobs can be opened immediately. The detail page polls status until a report is available."
        />

        {runs.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-ink/15 bg-mist/45 p-6 text-sm text-ink/65">
            No runs started yet.
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            {runs.map((run) => (
              <Link
                className="rounded-3xl border border-ink/10 bg-sand/70 p-5 transition hover:border-forest/30 hover:bg-white"
                href={`/projects/${data.project.id}/runs/${run.id}`}
                key={run.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-forest/60">
                      {run.triggerSource} • {datasetsById.get(run.datasetId)?.filename ?? run.datasetId}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-ink">
                      {runConfigsById.get(run.runConfigId)?.name ?? run.runConfigId}
                    </h3>
                    <p className="mt-2 text-sm text-ink/65">
                      {run.processedCases}/{run.totalCases ?? 0} cases • created {formatDate(run.createdAt)}
                    </p>
                  </div>
                  <StatusPill status={run.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ProjectCiPage() {
  const { data, loading, refresh } = useProjectData();
  const [tokenLabel, setTokenLabel] = useState("github-actions");
  const [tokenValue, setTokenValue] = useState("");
  const [issuedToken, setIssuedToken] = useState<{ plaintextToken: string; label?: string } | null>(null);
  const [selectedDatasetId, setSelectedDatasetId] = useState("");
  const [selectedRunConfigId, setSelectedRunConfigId] = useState("");
  const [creatingToken, setCreatingToken] = useState(false);
  const [testingRun, setTestingRun] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [tokenStatus, setTokenStatus] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [summary, setSummary] = useState<RunSummaryResponse | null>(null);

  useEffect(() => {
    if (!data) {
      return;
    }

    if (!selectedDatasetId && data.datasets[0]) {
      setSelectedDatasetId(data.datasets[0].id);
    }

    if (!selectedRunConfigId && data.runConfigs[0]) {
      setSelectedRunConfigId(data.runConfigs[0].id);
    }
  }, [data, selectedDatasetId, selectedRunConfigId]);

  if (loading && !data) {
    return <p className="text-sm text-ink/60">Loading CI settings...</p>;
  }

  if (!data) {
    return <EmptyState title="Project unavailable" body="The CI workspace could not be loaded." />;
  }

  const datasetId = data.datasets[0]?.id ?? "ds_123";
  const runConfigId = data.runConfigs[0]?.id ?? "cfg_123";
  const ciEndpoint = `/api/ci/${data.project.id}/run`;
  const summaryEndpoint = "/api/ci/<runId>/summary";
  const readyForCiTest = data.datasets.length > 0 && data.runConfigs.length > 0;

  async function handleCreateToken(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreatingToken(true);
    setTokenError(null);
    setTokenStatus(null);

    try {
      const created = await createCiToken(data.project.id, {
        label: tokenLabel.trim() || undefined
      });
      setIssuedToken({
        plaintextToken: created.plaintextToken,
        label: created.token.label
      });
      setTokenValue(created.plaintextToken);
      setTokenStatus(`Created CI token${created.token.label ? `: ${created.token.label}` : ""}`);
      await refresh();
    } catch (cause) {
      setTokenError(cause instanceof Error ? cause.message : "Unable to create CI token");
    } finally {
      setCreatingToken(false);
    }
  }

  async function handleCopyToken() {
    if (!issuedToken?.plaintextToken || typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(issuedToken.plaintextToken);
    setTokenStatus("Copied the newly issued CI token to the clipboard.");
  }

  async function handleTestCiRun(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!readyForCiTest) {
      return;
    }

    setTestingRun(true);
    setTestError(null);
    setTestStatus(null);
    setSummary(null);

    try {
      const started = await startCiRun(
        data.project.id,
        {
          datasetId: selectedDatasetId,
          runConfigId: selectedRunConfigId,
          pullRequest: {
            number: 42,
            sha: "manual-ci-test",
            branch: "workspace-ci-test"
          }
        },
        tokenValue
      );

      setTestStatus(`CI run queued: ${started.runId}`);

      let resolvedSummary: RunSummaryResponse | null = null;
      for (let attempt = 0; attempt < 40; attempt += 1) {
        await sleep(2500);
        resolvedSummary = await getCiSummary(started.runId, tokenValue);
        setSummary(resolvedSummary);

        if (resolvedSummary.status === "completed" || resolvedSummary.status === "failed") {
          break;
        }
      }

      if (!resolvedSummary) {
        throw new Error("CI summary did not resolve");
      }

      if (resolvedSummary.status !== "completed" && resolvedSummary.status !== "failed") {
        throw new Error(`CI summary polling timed out while run was ${resolvedSummary.status}`);
      }

      setTestStatus(
        resolvedSummary.status === "completed"
          ? `CI run completed: ${resolvedSummary.pass ? "pass" : "fail"}`
          : `CI run finished with status ${resolvedSummary.status}`
      );
    } catch (cause) {
      setTestError(cause instanceof Error ? cause.message : "Unable to test the CI integration");
    } finally {
      setTestingRun(false);
    }
  }

  const workflowYaml = [
    "name: evalgate",
    "on:",
    "  pull_request:",
    "",
    "jobs:",
    "  evalgate:",
    "    runs-on: ubuntu-latest",
    "    steps:",
    "      - uses: actions/checkout@v4",
    "      - name: Run EvalGate",
    "        uses: your-org/evalgate-action@v1",
    "        with:",
    "          evalgate_url: ${{ secrets.EVALGATE_URL }}",
    `          project_id: ${data.project.id}`,
    `          dataset_id: ${datasetId}`,
    `          run_config_id: ${runConfigId}`,
    "          evalgate_token: ${{ secrets.EVALGATE_TOKEN }}"
  ].join("\n");

  const curlCommand = [
    "curl -X POST \\",
    `  -H "Authorization: Bearer $EVALGATE_TOKEN" \\`,
    '  -H "Content-Type: application/json" \\',
    `  "https://your-evalgate-host${ciEndpoint}" \\`,
    `  -d '{"datasetId":"${datasetId}","runConfigId":"${runConfigId}","pullRequest":{"number":42,"sha":"abc123","branch":"feature/prompt"}}'`
  ].join("\n");

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <div className={cardClass}>
        <SectionIntro
          eyebrow="CI Gate"
          title="Wire pull requests into EvalGate"
          description="The backend already exposes the CI trigger and summary endpoints. This page documents the values to pass into the GitHub Action."
        />

        <div className="mt-6 grid gap-4 rounded-3xl border border-ink/10 bg-sand/70 p-5 text-sm text-ink/70">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-forest/60">Project ID</p>
            <p className="mt-2 break-all font-mono text-xs text-ink">{data.project.id}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-forest/60">Run trigger endpoint</p>
            <p className="mt-2 break-all font-mono text-xs text-ink">{ciEndpoint}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-forest/60">Summary endpoint</p>
            <p className="mt-2 break-all font-mono text-xs text-ink">{summaryEndpoint}</p>
          </div>
        </div>

        <form className="mt-5 grid gap-4" onSubmit={handleCreateToken}>
          <label className="grid gap-2 text-sm font-medium text-ink">
            Token label
            <input
              className="rounded-2xl border border-ink/10 bg-sand px-4 py-3 text-sm outline-none ring-signal transition focus:ring-2"
              onChange={(event) => setTokenLabel(event.target.value)}
              placeholder="github-actions"
              value={tokenLabel}
            />
          </label>

          <button
            className="w-fit rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition hover:bg-forest disabled:opacity-60"
            disabled={creatingToken}
            type="submit"
          >
            {creatingToken ? "Issuing..." : "Create CI token"}
          </button>

          {tokenStatus ? <p className="text-sm text-forest">{tokenStatus}</p> : null}
          {tokenError ? <p className="text-sm text-red-700">{tokenError}</p> : null}
        </form>

        {issuedToken ? (
          <div className="mt-5 rounded-3xl border border-emerald-200 bg-emerald-50/70 p-5">
            <p className="text-sm font-medium text-emerald-900">Plaintext token</p>
            <p className="mt-2 text-sm leading-6 text-emerald-900/80">
              This value is only shown now. The stored record is hashed and cannot be recovered later.
            </p>
            <pre className="mt-4 overflow-x-auto rounded-2xl border border-emerald-200 bg-white p-4 font-mono text-xs text-ink">
              {issuedToken.plaintextToken}
            </pre>
            <button
              className="mt-4 rounded-full border border-emerald-300 px-4 py-2 text-sm font-medium text-emerald-900 transition hover:border-emerald-500"
              onClick={() => void handleCopyToken()}
              type="button"
            >
              Copy token
            </button>
          </div>
        ) : null}

        <pre className="mt-5 overflow-x-auto rounded-3xl border border-ink/10 bg-ink p-4 text-xs leading-6 text-mist">
          {curlCommand}
        </pre>
      </div>

      <div className="grid gap-6">
        <div className={cardClass}>
          <SectionIntro
            eyebrow="Workflow"
            title="GitHub Action example"
            description="Use the dataset and run config IDs from this project or replace them with pinned evaluation fixtures."
          />
          <pre className="mt-6 overflow-x-auto rounded-3xl border border-ink/10 bg-ink p-4 text-xs leading-6 text-mist">
            {workflowYaml}
          </pre>
        </div>

        <div className={cardClass}>
          <SectionIntro
            eyebrow="Test Integration"
            title="Trigger a CI-authenticated run"
            description="Use an issued token against the CI endpoint before wiring the GitHub secret in the external repository."
          />

          {!readyForCiTest ? (
            <div className="mt-6 rounded-3xl border border-dashed border-ink/15 bg-mist/45 p-6 text-sm text-ink/65">
              Create at least one dataset and one run config before testing CI runs.
            </div>
          ) : (
            <form className="mt-6 grid gap-4" onSubmit={handleTestCiRun}>
              <label className="grid gap-2 text-sm font-medium text-ink">
                Dataset
                <select
                  className="rounded-2xl border border-ink/10 bg-sand px-4 py-3 text-sm outline-none ring-signal transition focus:ring-2"
                  onChange={(event) => setSelectedDatasetId(event.target.value)}
                  value={selectedDatasetId}
                >
                  {data.datasets.map((dataset) => (
                    <option key={dataset.id} value={dataset.id}>
                      {dataset.filename} ({dataset.rowCount} cases)
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-medium text-ink">
                Run config
                <select
                  className="rounded-2xl border border-ink/10 bg-sand px-4 py-3 text-sm outline-none ring-signal transition focus:ring-2"
                  onChange={(event) => setSelectedRunConfigId(event.target.value)}
                  value={selectedRunConfigId}
                >
                  {data.runConfigs.map((runConfig) => (
                    <option key={runConfig.id} value={runConfig.id}>
                      {runConfig.name} ({runConfig.modelName})
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-medium text-ink">
                CI token
                <input
                  className="rounded-2xl border border-ink/10 bg-sand px-4 py-3 text-sm outline-none ring-signal transition focus:ring-2"
                  onChange={(event) => setTokenValue(event.target.value)}
                  placeholder="egt_..."
                  type="password"
                  value={tokenValue}
                />
              </label>

              <button
                className="w-fit rounded-full bg-signal px-5 py-3 text-sm font-medium text-white transition hover:bg-amber-700 disabled:opacity-60"
                disabled={testingRun || !tokenValue || !selectedDatasetId || !selectedRunConfigId}
                type="submit"
              >
                {testingRun ? "Testing..." : "Trigger test CI run"}
              </button>

              {testStatus ? <p className="text-sm text-forest">{testStatus}</p> : null}
              {testError ? <p className="text-sm text-red-700">{testError}</p> : null}
            </form>
          )}

          {summary ? (
            <div className="mt-6 grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <MetricCard
                  label="status"
                  value={summary.status}
                  hint={
                    summary.status === "completed"
                      ? summary.pass
                        ? "pass"
                        : "fail"
                      : summary.status === "failed"
                        ? "failed"
                        : "waiting for gate result"
                  }
                />
                <MetricCard
                  label="report"
                  value={summary.reportUrl ? "available" : "pending"}
                  hint={summary.reportUrl ?? "Report URL will appear after completion"}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <MetricCard label="schema_valid_rate" value={formatPercent(summary.metrics.schema_valid_rate)} />
                <MetricCard label="enum_accuracy" value={formatPercent(summary.metrics.enum_accuracy)} />
                <MetricCard label="field_level_accuracy" value={formatPercent(summary.metrics.field_level_accuracy)} />
                <MetricCard label="latency_p95_ms" value={formatLatency(summary.metrics.latency_p95_ms)} />
              </div>

              <div className="rounded-3xl border border-ink/10 bg-sand/70 p-5">
                <p className="text-sm font-medium text-ink">Gate reasons</p>
                {summary.gateReasons.length === 0 ? (
                  <p className="mt-2 text-sm text-ink/65">No gate failures recorded.</p>
                ) : (
                  <div className="mt-3 grid gap-2">
                    {summary.gateReasons.map((reason) => (
                      <p className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink/70" key={reason}>
                        {reason}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {summary.reportUrl ? (
                <a
                  className="w-fit rounded-full border border-ink/15 px-4 py-2 text-sm font-medium text-ink transition hover:border-forest hover:text-forest"
                  href={summary.reportUrl}
                  target="_blank"
                >
                  Open report.json
                </a>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className={cardClass}>
          <SectionIntro
            eyebrow="Stored CI Tokens"
            title="Hashed credentials in the project store"
            description="Only token metadata is retrievable after creation. Plaintext tokens should be shown once during issuance."
          />

          {data.ciTokens.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-ink/15 bg-mist/45 p-6 text-sm text-ink/65">
              No CI token metadata is visible for this project yet.
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              {data.ciTokens.map((token) => (
                <div className="rounded-3xl border border-ink/10 bg-sand/70 p-5" key={token.id}>
                  <p className="text-xs uppercase tracking-[0.18em] text-forest/60">{token.label ?? "CI token"}</p>
                  <p className="mt-2 font-mono text-xs text-ink/60">{token.tokenHash.slice(0, 20)}...</p>
                  <p className="mt-3 text-sm text-ink/65">
                    Created {formatDate(token.createdAt)} • last used {formatDate(token.lastUsedAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
