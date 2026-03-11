import { NextResponse } from "next/server";

import { getCurrentUser } from "../../../lib/auth";
import { createProject, listProjects } from "../../../lib/server/database";
import { createProjectSchema } from "../../../lib/validations";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json(await listProjects(user.id));
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const payload = createProjectSchema.parse(await request.json());
  const project = await createProject({ ...payload, ownerId: user.id, ownerEmail: user.email });
  return NextResponse.json(project);
}
