import { NextResponse } from "next/server";

import { requireDatasetOwner } from "../../../../lib/server/authorization";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: { datasetId: string } }) {
  const access = await requireDatasetOwner(request, context.params.datasetId);
  if ("response" in access) {
    return access.response;
  }
  return NextResponse.json(access.dataset);
}
