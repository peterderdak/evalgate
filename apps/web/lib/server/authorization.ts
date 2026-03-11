import { NextResponse } from "next/server";

import { getCurrentUser, type CurrentUser } from "../auth";
import { getDataset, getProject, getRun } from "./database";

type Failure = {
  response: NextResponse;
};

type ProjectAccess = Failure | { user: CurrentUser; project: Awaited<ReturnType<typeof getProject>> extends infer T ? Exclude<T, null> : never };
type DatasetAccess = Failure | { user: CurrentUser; dataset: Awaited<ReturnType<typeof getDataset>> extends infer T ? Exclude<T, null> : never };
type RunAccess = Failure | { user: CurrentUser; run: Awaited<ReturnType<typeof getRun>> extends infer T ? Exclude<T, null> : never };

function unauthorized() {
  return {
    response: NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  } satisfies Failure;
}

function forbidden() {
  return {
    response: NextResponse.json({ error: "Forbidden" }, { status: 403 })
  } satisfies Failure;
}

function notFound(message: string) {
  return {
    response: NextResponse.json({ error: message }, { status: 404 })
  } satisfies Failure;
}

export async function requireCurrentUser(request: Request) {
  const user = await getCurrentUser(request);
  return user ? { user } : unauthorized();
}

export async function requireProjectOwner(request: Request, projectId: string): Promise<ProjectAccess> {
  const auth = await requireCurrentUser(request);
  if ("response" in auth) {
    return auth;
  }

  const project = await getProject(projectId);
  if (!project) {
    return notFound("Project not found");
  }
  if (project.ownerId !== auth.user.id) {
    return forbidden();
  }

  return {
    user: auth.user,
    project
  };
}

export async function requireDatasetOwner(request: Request, datasetId: string): Promise<DatasetAccess> {
  const auth = await requireCurrentUser(request);
  if ("response" in auth) {
    return auth;
  }

  const dataset = await getDataset(datasetId);
  if (!dataset) {
    return notFound("Dataset not found");
  }

  const project = await getProject(dataset.projectId);
  if (!project || project.ownerId !== auth.user.id) {
    return forbidden();
  }

  return {
    user: auth.user,
    dataset
  };
}

export async function requireRunOwner(request: Request, runId: string): Promise<RunAccess> {
  const auth = await requireCurrentUser(request);
  if ("response" in auth) {
    return auth;
  }

  const run = await getRun(runId);
  if (!run) {
    return notFound("Run not found");
  }

  const project = await getProject(run.projectId);
  if (!project || project.ownerId !== auth.user.id) {
    return forbidden();
  }

  return {
    user: auth.user,
    run
  };
}
