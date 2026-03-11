import { NextResponse } from "next/server";

import { getRunReport } from "../../../../../lib/server/database";
import { requireRunOwner } from "../../../../../lib/server/authorization";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: { runId: string } }) {
  const access = await requireRunOwner(request, context.params.runId);
  if ("response" in access) {
    return access.response;
  }

  const report = await getRunReport(context.params.runId);
  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }
  return NextResponse.json(report.report);
}
