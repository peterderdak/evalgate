import { NextResponse } from "next/server";

import { getProject, listCiTokens, listDatasets, listRunConfigs, listRuns } from "../../../../lib/server/database";

export const runtime = "nodejs";

export async function GET(_: Request, context: { params: { projectId: string } }) {
  const project = await getProject(context.params.projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({
    project,
    datasets: await listDatasets(project.id),
    runConfigs: await listRunConfigs(project.id),
    runs: await listRuns(project.id),
    ciTokens: await listCiTokens(project.id)
  });
}
