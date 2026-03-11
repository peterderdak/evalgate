import * as core from "@actions/core";

type CiStartResponse = {
  runId: string;
  status: string;
};

type CiSummaryResponse = {
  runId: string;
  status: string;
  pass: boolean;
  metrics: Record<string, number | null>;
  gateReasons: string[];
  reportUrl?: string;
};

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const baseUrl = core.getInput("evalgate_url");
  const projectId = core.getInput("project_id");
  const datasetId = core.getInput("dataset_id");
  const runConfigId = core.getInput("run_config_id");
  const token = core.getInput("evalgate_token");

  const startResponse = await fetch(`${baseUrl}/api/ci/${projectId}/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ datasetId, runConfigId })
  });

  if (!startResponse.ok) {
    throw new Error(`Failed to start EvalGate run: ${startResponse.status} ${await startResponse.text()}`);
  }

  const started = (await startResponse.json()) as CiStartResponse;
  core.info(`EvalGate run created: ${started.runId}`);

  let summary: CiSummaryResponse | null = null;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await sleep(5000);
    const response = await fetch(`${baseUrl}/api/ci/${started.runId}/summary`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    if (!response.ok) {
      throw new Error(`Failed to poll EvalGate summary: ${response.status} ${await response.text()}`);
    }
    summary = (await response.json()) as CiSummaryResponse;
    if (summary.status === "completed" || summary.status === "failed") {
      break;
    }
  }

  if (!summary) {
    throw new Error("EvalGate summary did not resolve");
  }

  core.summary
    .addHeading("EvalGate Summary")
    .addTable([
      [
        { data: "Run ID", header: true },
        { data: summary.runId, header: false }
      ],
      [
        { data: "Status", header: true },
        { data: summary.status, header: false }
      ],
      [
        { data: "Pass", header: true },
        { data: String(summary.pass), header: false }
      ]
    ])
    .addCodeBlock(JSON.stringify(summary.metrics, null, 2), "json");

  if (summary.gateReasons.length > 0) {
    core.summary.addHeading("Gate Reasons", 2).addList(summary.gateReasons);
  }

  if (summary.reportUrl) {
    core.summary.addLink("Report", summary.reportUrl);
  }

  await core.summary.write();

  if (!summary.pass) {
    core.setFailed(summary.gateReasons.join("\n") || "EvalGate gate failed");
  }
}

main().catch((error) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
