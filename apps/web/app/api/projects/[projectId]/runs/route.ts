import { NextResponse } from "next/server";

import { requiresProviderApiKey } from "@evalgate/shared";

import { createRun, getProject, getRunConfig, getDataset } from "../../../../../lib/server/database";
import { maybeRunInline } from "../../../../../lib/server/eval-service";
import { encryptJobSecret } from "../../../../../lib/server/job-secrets";
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
  const apiKeyRequired = requiresProviderApiKey(runConfig.modelProvider);
  if (apiKeyRequired && !payload.apiKey) {
    return NextResponse.json({ error: `API key required for provider ${runConfig.modelProvider}` }, { status: 400 });
  }

  const run = await createRun({
    projectId: project.id,
    datasetId: payload.datasetId,
    runConfigId: payload.runConfigId,
    triggerSource: "manual",
    jobPayload: apiKeyRequired
      ? {
          apiKeySource: "encrypted",
          encryptedApiKey: encryptJobSecret(payload.apiKey)
        }
      : {
          apiKeySource: "none"
        }
  });
  await maybeRunInline(run.id);
  return NextResponse.json({ runId: run.id, status: "queued" });
}
