import { writeFile } from "node:fs/promises";

import { NextResponse } from "next/server";

import { loadDataset } from "@evalgate/eval-core";

import { createDataset, getProject, listDatasets } from "../../../../../lib/server/database";

export const runtime = "nodejs";

export async function GET(_: Request, context: { params: { projectId: string } }) {
  return NextResponse.json(await listDatasets(context.params.projectId));
}

export async function POST(request: Request, context: { params: { projectId: string } }) {
  const project = await getProject(context.params.projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || !file.name.endsWith(".jsonl")) {
    return NextResponse.json({ error: "Only .jsonl files are accepted" }, { status: 400 });
  }

  const contents = await file.text();
  const tempPath = `/tmp/${Date.now()}-${file.name}`;
  await writeFile(tempPath, contents, "utf8");
  const rows = await loadDataset(tempPath);
  const dataset = await createDataset({
    projectId: project.id,
    filename: file.name,
    contents,
    rowCount: rows.length
  });

  return NextResponse.json(dataset);
}
