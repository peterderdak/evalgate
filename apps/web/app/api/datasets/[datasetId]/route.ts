import { NextResponse } from "next/server";

import { getDataset } from "../../../../lib/server/database";

export const runtime = "nodejs";

export async function GET(_: Request, context: { params: { datasetId: string } }) {
  const dataset = await getDataset(context.params.datasetId);
  if (!dataset) {
    return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
  }
  return NextResponse.json(dataset);
}
