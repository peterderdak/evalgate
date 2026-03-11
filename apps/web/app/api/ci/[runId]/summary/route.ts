import { NextResponse } from "next/server";

import { authenticateCiToken } from "../../../../../lib/server/ci-auth";
import { getRun } from "../../../../../lib/server/database";
import { buildCiSummary } from "../../../../../lib/server/eval-service";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: { runId: string } }) {
  const run = await getRun(context.params.runId);
  if (!run) {
    return NextResponse.json({ error: "Run summary not found" }, { status: 404 });
  }

  const ciToken = await authenticateCiToken(run.projectId, request.headers.get("authorization"));
  if (!ciToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await buildCiSummary(context.params.runId, request.url);
  if (!summary) {
    return NextResponse.json({ error: "Run summary not found" }, { status: 404 });
  }
  return NextResponse.json(summary);
}
