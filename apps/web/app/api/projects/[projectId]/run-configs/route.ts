import { NextResponse } from "next/server";

import { createRunConfig, getProject, listRunConfigs } from "../../../../../lib/server/database";
import { createRunConfigSchema } from "../../../../../lib/validations";

export const runtime = "nodejs";

export async function GET(_: Request, context: { params: { projectId: string } }) {
  return NextResponse.json(await listRunConfigs(context.params.projectId));
}

export async function POST(request: Request, context: { params: { projectId: string } }) {
  const project = await getProject(context.params.projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const payload = createRunConfigSchema.parse(await request.json());
  const runConfig = await createRunConfig({
    projectId: project.id,
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
