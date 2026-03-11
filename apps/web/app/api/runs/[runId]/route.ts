import { NextResponse } from "next/server";

import { getRun } from "../../../../lib/server/database";

export const runtime = "nodejs";

export async function GET(_: Request, context: { params: { runId: string } }) {
  const run = await getRun(context.params.runId);
  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }
  return NextResponse.json({
    id: run.id,
    status: run.status,
    processedCases: run.processedCases,
    totalCases: run.totalCases ?? 0
  });
}
