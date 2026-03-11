import { NextResponse } from "next/server";

import { parseDatasetText } from "@evalgate/eval-core";

import { createDataset, listDatasets } from "../../../../../lib/server/database";
import { requireProjectOwner } from "../../../../../lib/server/authorization";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: { projectId: string } }) {
  const access = await requireProjectOwner(request, context.params.projectId);
  if ("response" in access) {
    return access.response;
  }
  return NextResponse.json(await listDatasets(access.project.id));
}

export async function POST(request: Request, context: { params: { projectId: string } }) {
  const access = await requireProjectOwner(request, context.params.projectId);
  if ("response" in access) {
    return access.response;
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || !file.name.endsWith(".jsonl")) {
    return NextResponse.json({ error: "Only .jsonl files are accepted" }, { status: 400 });
  }

  const contents = await file.text();
  const rows = parseDatasetText(contents);
  const dataset = await createDataset({
    projectId: access.project.id,
    filename: file.name,
    contents,
    rowCount: rows.length
  });

  return NextResponse.json(dataset);
}
