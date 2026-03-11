import { NextResponse } from "next/server";

import { getCurrentUser } from "../../../lib/auth";
import { createProject, listProjects } from "../../../lib/server/database";
import { createProjectSchema } from "../../../lib/validations";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await listProjects(user.id));
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = createProjectSchema.parse(await request.json());
  const project = await createProject({ ...payload, ownerId: user.id, ownerEmail: user.email });
  return NextResponse.json(project);
}
