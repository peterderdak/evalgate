import { NextResponse } from "next/server";

import { getProject, listCiTokens, listDatasets, listRunConfigs, listRuns } from "../../../../lib/server/database";
import { requireProjectOwner } from "../../../../lib/server/authorization";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: { projectId: string } }) {
  const access = await requireProjectOwner(request, context.params.projectId);
  if ("response" in access) {
    return access.response;
  }

  return NextResponse.json({
    project: access.project,
    datasets: await listDatasets(access.project.id),
    runConfigs: await listRunConfigs(access.project.id),
    runs: await listRuns(access.project.id),
    ciTokens: await listCiTokens(access.project.id)
  });
}
