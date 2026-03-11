import { NextResponse } from "next/server";

import { createRunConfig, listRunConfigs } from "../../../../../lib/server/database";
import { requireProjectOwner } from "../../../../../lib/server/authorization";
import { createRunConfigSchema } from "../../../../../lib/validations";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: { projectId: string } }) {
  const access = await requireProjectOwner(request, context.params.projectId);
  if ("response" in access) {
    return access.response;
  }
  return NextResponse.json(await listRunConfigs(access.project.id));
}

export async function POST(request: Request, context: { params: { projectId: string } }) {
  const access = await requireProjectOwner(request, context.params.projectId);
  if ("response" in access) {
    return access.response;
  }

  const payload = createRunConfigSchema.parse(await request.json());
  const runConfig = await createRunConfig({
    projectId: access.project.id,
    name: payload.name,
    promptText: payload.promptText,
    promptVersion: payload.promptVersion,
    modelProvider: payload.modelProvider,
    modelName: payload.modelName,
    schema: payload.schema,
    thresholds: payload.thresholds
  });
  return NextResponse.json(runConfig);
}
