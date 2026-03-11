import { NextResponse } from "next/server";

import { getRunReport } from "../../../../../lib/server/database";

export const runtime = "nodejs";

export async function GET(_: Request, context: { params: { runId: string } }) {
  const report = await getRunReport(context.params.runId);
  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }
  return NextResponse.json(report.report);
}
