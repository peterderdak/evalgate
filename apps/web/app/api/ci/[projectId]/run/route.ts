import { NextResponse } from "next/server";

import { requiresProviderApiKey } from "@evalgate/shared";

import { authenticateCiToken } from "../../../../../lib/server/ci-auth";
import { createRun, getProject, getRunConfig, getDataset } from "../../../../../lib/server/database";
import { maybeRunInline } from "../../../../../lib/server/eval-service";
import { startCiRunSchema } from "../../../../../lib/validations";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: { projectId: string } }) {
  const ciToken = await authenticateCiToken(context.params.projectId, request.headers.get("authorization"));
  if (!ciToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await getProject(context.params.projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const payload = startCiRunSchema.parse(await request.json());
  const dataset = await getDataset(payload.datasetId);
  const runConfig = await getRunConfig(payload.runConfigId);
  if (!dataset || !runConfig) {
    return NextResponse.json({ error: "Dataset or run config not found" }, { status: 404 });
  }
  const apiKeySource = requiresProviderApiKey(runConfig.modelProvider) ? "env" : "none";

  const run = await createRun({
    projectId: project.id,
    datasetId: payload.datasetId,
    runConfigId: payload.runConfigId,
    triggerSource: "ci",
    jobPayload: {
      apiKeySource,
      pullRequest: payload.pullRequest
    }
  });
  await maybeRunInline(run.id);
  return NextResponse.json({ runId: run.id, status: run.status });
}
