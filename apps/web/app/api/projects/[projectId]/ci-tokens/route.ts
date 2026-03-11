import { NextResponse } from "next/server";

import { createCiToken, listCiTokens } from "../../../../../lib/server/database";
import { requireProjectOwner } from "../../../../../lib/server/authorization";
import { createCiTokenSchema } from "../../../../../lib/validations";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: { projectId: string } }) {
  const access = await requireProjectOwner(request, context.params.projectId);
  if ("response" in access) {
    return access.response;
  }
  return NextResponse.json(await listCiTokens(access.project.id));
}

export async function POST(request: Request, context: { params: { projectId: string } }) {
  const access = await requireProjectOwner(request, context.params.projectId);
  if ("response" in access) {
    return access.response;
  }

  const payload = createCiTokenSchema.parse(await request.json());
  const issuedToken = await createCiToken(access.project.id, payload.label);
  return NextResponse.json(issuedToken);
}
