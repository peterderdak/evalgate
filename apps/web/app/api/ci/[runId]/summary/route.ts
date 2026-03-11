import { NextResponse } from "next/server";

import { buildCiSummary } from "../../../../../lib/server/eval-service";

export const runtime = "nodejs";

export async function GET(_: Request, context: { params: { runId: string } }) {
  const summary = await buildCiSummary(context.params.runId);
  if (!summary) {
    return NextResponse.json({ error: "Run summary not found" }, { status: 404 });
  }
  return NextResponse.json(summary);
}
