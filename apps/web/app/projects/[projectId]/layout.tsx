import type { ReactNode } from "react";

import { RequireAuth } from "../../../components/auth-provider";
import { ProjectShell } from "../../../components/project-shell";

export default function ProjectLayout({
  children,
  params
}: {
  children: ReactNode;
  params: { projectId: string };
}) {
  return (
    <RequireAuth>
      <ProjectShell projectId={params.projectId}>{children}</ProjectShell>
    </RequireAuth>
  );
}
