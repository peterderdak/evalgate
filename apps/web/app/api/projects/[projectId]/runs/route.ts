import { NextResponse } from "next/server";

import { createRun, getProject, getRunConfig, getDataset } from "../../../../../lib/server/database";
import { maybeRunInline } from "../../../../../lib/server/eval-service";
import { startRunSchema } from "../../../../../lib/validations";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: { projectId: string } }) {
  const project = await getProject(context.params.projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const payload = startRunSchema.parse(await request.json());
  const dataset = await getDataset(payload.datasetId);
  const runConfig = await getRunConfig(payload.runConfigId);
  if (!dataset || !runConfig) {
    return NextResponse.json({ error: "Dataset or run config not found" }, { status: 404 });
  }

  process.env.OPENAI_API_KEY = payload.apiKey;
  const run = await createRun({
    projectId: project.id,
    datasetId: payload.datasetId,
    runConfigId: payload.runConfigId,
    triggerSource: "manual"
  });
  await maybeRunInline(run.id);
  return NextResponse.json({ runId: run.id, status: "queued" });
}
