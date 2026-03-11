import { NextResponse } from "next/server";

import { listFailures } from "../../../../../lib/server/database";

export const runtime = "nodejs";

export async function GET(_: Request, context: { params: { runId: string } }) {
  return NextResponse.json(await listFailures(context.params.runId));
}
