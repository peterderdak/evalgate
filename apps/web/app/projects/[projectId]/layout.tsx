import type { ReactNode } from "react";

import { ProjectShell } from "../../../components/project-shell";

export default function ProjectLayout({
  children,
  params
}: {
  children: ReactNode;
  params: { projectId: string };
}) {
  return <ProjectShell projectId={params.projectId}>{children}</ProjectShell>;
}
