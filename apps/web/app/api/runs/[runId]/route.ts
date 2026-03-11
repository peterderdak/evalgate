import { NextResponse } from "next/server";

import { requireRunOwner } from "../../../../lib/server/authorization";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: { runId: string } }) {
  const access = await requireRunOwner(request, context.params.runId);
  if ("response" in access) {
    return access.response;
  }
  return NextResponse.json({
    id: access.run.id,
    status: access.run.status,
    processedCases: access.run.processedCases,
    totalCases: access.run.totalCases ?? 0
  });
}
