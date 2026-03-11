"use client";

import { useState } from "react";

type ProjectResponse = {
  project: {
    id: string;
    name: string;
  };
};

type UploadResponse = {
  dataset: {
    id: string;
    name: string;
    recordCount: number;
  };
};

type EvaluationResponse = {
  reportId: string;
  metrics: {
    schema_valid_rate: number;
    enum_accuracy: number;
    field_level_accuracy: number;
    latency_p95: number;
  };
  workflowYaml: string;
  report: {
    samples: Array<{
      recordId: string;
      schemaValid: boolean;
      fieldAccuracy: number;
      enumAccuracy: number | null;
      latencyMs: number;
      actual: Record<string, unknown> | null;
    }>;
  };
};

const cardClass =
  "rounded-3xl border border-ink/10 bg-white/80 p-6 shadow-card backdrop-blur transition hover:-translate-y-0.5";

export function Dashboard() {
  const [projectId, setProjectId] = useState("");
  const [datasetId, setDatasetId] = useState("");
  const [projectName, setProjectName] = useState("Support Ticket Triage");
  const [description, setDescription] = useState("Classify support ticket category, priority, and sentiment.");
  const [uploading, setUploading] = useState(false);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("Ready.");
  const [workflowYaml, setWorkflowYaml] = useState("");
  const [result, setResult] = useState<EvaluationResponse | null>(null);
  const [reportLink, setReportLink] = useState("");

  async function createProject() {
    setStatus("Creating project...");
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: projectName, description })
    });
    const data = (await response.json()) as ProjectResponse;
    setProjectId(data.project.id);
    setStatus(`Project ready: ${data.project.name}`);
  }

  async function uploadDataset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fileInput = event.currentTarget.elements.namedItem("dataset") as HTMLInputElement | null;
    const file = fileInput?.files?.[0];

    if (!file || !projectId) {
      setStatus("Create a project first, then select a JSONL file.");
      return;
    }

    setUploading(true);
    setStatus("Uploading dataset...");
    const formData = new FormData();
    formData.set("projectId", projectId);
    formData.set("file", file);

    const response = await fetch("/api/datasets/upload", {
      method: "POST",
      body: formData
    });
    const data = (await response.json()) as UploadResponse;
    setDatasetId(data.dataset.id);
    setStatus(`Dataset uploaded: ${data.dataset.name} (${data.dataset.recordCount} rows)`);
    setUploading(false);
  }

  async function runEvaluation() {
    if (!projectId || !datasetId) {
      setStatus("Create a project and upload a dataset before running an evaluation.");
      return;
    }

    setRunning(true);
    setStatus("Running evaluation...");
    const response = await fetch("/api/evaluations/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        datasetId,
        provider: "mock",
        model: "mock-gpt",
        thresholds: {
          schema_valid_rate: 0.95,
          field_level_accuracy: 0.9
        }
      })
    });
    const data = (await response.json()) as EvaluationResponse;
    setResult(data);
    setWorkflowYaml(data.workflowYaml);
    setReportLink(`/api/reports/${data.reportId}`);
    setStatus("Evaluation complete.");
    setRunning(false);
  }

  return (
    <main className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="grid gap-6">
        <div className={cardClass}>
          <p className="text-sm uppercase tracking-[0.2em] text-forest/60">1. Create Project</p>
          <div className="mt-4 grid gap-4">
            <input
              className="rounded-2xl border border-ink/10 bg-sand px-4 py-3 outline-none ring-signal transition focus:ring-2"
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              placeholder="Project name"
            />
            <textarea
              className="min-h-28 rounded-2xl border border-ink/10 bg-sand px-4 py-3 outline-none ring-signal transition focus:ring-2"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe the evaluation target"
            />
            <button
              className="w-fit rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition hover:bg-forest"
              onClick={createProject}
              type="button"
            >
              Create project
            </button>
            <p className="text-sm text-ink/60">Project ID: {projectId || "not created yet"}</p>
          </div>
        </div>

        <form className={cardClass} onSubmit={uploadDataset}>
          <p className="text-sm uppercase tracking-[0.2em] text-forest/60">2. Upload Dataset</p>
          <div className="mt-4 grid gap-4">
            <input
              className="block w-full rounded-2xl border border-dashed border-ink/20 bg-mist/50 px-4 py-5"
              type="file"
              name="dataset"
              accept=".jsonl,application/x-ndjson"
            />
            <button
              className="w-fit rounded-full bg-signal px-5 py-3 text-sm font-medium text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={uploading || !projectId}
              type="submit"
            >
              {uploading ? "Uploading..." : "Upload JSONL"}
            </button>
            <p className="text-sm text-ink/60">Dataset ID: {datasetId || "no dataset uploaded yet"}</p>
          </div>
        </form>

        <div className={cardClass}>
          <p className="text-sm uppercase tracking-[0.2em] text-forest/60">3. Run Evaluation</p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <button
              className="rounded-full bg-forest px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={running || !datasetId}
              onClick={runEvaluation}
              type="button"
            >
              {running ? "Evaluating..." : "Run evaluation"}
            </button>
            <p className="text-sm text-ink/60">Provider: mock (swap API route payload to OpenAI or Anthropic)</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6">
        <div className={cardClass}>
          <p className="text-sm uppercase tracking-[0.2em] text-forest/60">4. Display Report</p>
          <p className="mt-3 text-sm text-ink/60">{status}</p>
          {result ? (
            <div className="mt-5 grid gap-4">
              <div className="grid grid-cols-2 gap-3">
                <Metric label="schema_valid_rate" value={result.metrics.schema_valid_rate} />
                <Metric label="enum_accuracy" value={result.metrics.enum_accuracy} />
                <Metric label="field_level_accuracy" value={result.metrics.field_level_accuracy} />
                <Metric label="latency_p95" value={`${result.metrics.latency_p95}ms`} />
              </div>
              <div className="rounded-2xl border border-ink/10 bg-sand/80 p-4">
                <p className="text-sm font-medium">Latest samples</p>
                <div className="mt-3 space-y-3">
                  {result.report.samples.map((sample) => (
                    <div className="rounded-2xl border border-ink/10 bg-white px-4 py-3" key={sample.recordId}>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium">{sample.recordId}</span>
                        <span className={sample.schemaValid ? "text-forest" : "text-red-600"}>
                          {sample.schemaValid ? "schema valid" : "schema invalid"}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-ink/60">
                        field accuracy {sample.fieldAccuracy} • enum accuracy {sample.enumAccuracy ?? "n/a"} • latency{" "}
                        {sample.latencyMs}ms
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <a className="text-sm font-medium text-forest underline" href={reportLink} target="_blank">
                Open raw report JSON
              </a>
            </div>
          ) : (
            <p className="mt-5 text-sm text-ink/50">Run an evaluation to populate metrics and per-sample results.</p>
          )}
        </div>

        <div className={cardClass}>
          <p className="text-sm uppercase tracking-[0.2em] text-forest/60">5. Export GitHub CI Gate</p>
          <p className="mt-3 text-sm text-ink/60">
            The evaluation API also generates a workflow template you can drop into `.github/workflows`.
          </p>
          <textarea
            className="mt-4 min-h-80 w-full rounded-2xl border border-ink/10 bg-ink p-4 font-mono text-xs text-mist outline-none"
            readOnly
            value={workflowYaml || "# Run an evaluation to generate workflow YAML"}
          />
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-mist/50 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-ink/50">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
