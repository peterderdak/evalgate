import { NextResponse } from "next/server";

import { createCiToken, getProject, listCiTokens } from "../../../../../lib/server/database";
import { createCiTokenSchema } from "../../../../../lib/validations";

export const runtime = "nodejs";

export async function GET(_: Request, context: { params: { projectId: string } }) {
  return NextResponse.json(await listCiTokens(context.params.projectId));
}

export async function POST(request: Request, context: { params: { projectId: string } }) {
  const project = await getProject(context.params.projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const payload = createCiTokenSchema.parse(await request.json());
  const issuedToken = await createCiToken(project.id, payload.label);
  return NextResponse.json(issuedToken);
}
