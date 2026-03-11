import type {
  CiToken,
  CreateCiTokenRequest,
  CreateCiTokenResponse,
  CreateProjectRequest,
  CreateRunConfigRequest,
  Dataset,
  FailureRecord,
  Project,
  Run,
  RunConfig,
  RunReport,
  RunSummaryResponse
} from "@evalgate/shared";

export type ProjectWorkspaceResponse = {
  project: Project;
  datasets: Dataset[];
  runConfigs: RunConfig[];
  runs: Run[];
  ciTokens: CiToken[];
};

export type RunStatusResponse = {
  id: string;
  status: Run["status"];
  processedCases: number;
  totalCases: number;
};

export type StartRunResponse = {
  runId: string;
  status: Run["status"] | "queued";
};

export type StartCiRunResponse = {
  runId: string;
  status: Run["status"];
};

export async function apiRequest<T>(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, {
    cache: "no-store",
    ...init
  });
  if (!response.ok) {
    const text = await response.text();
    let message = text || `${response.status} ${response.statusText}`;

    try {
      const payload = JSON.parse(text) as { error?: string };
      message = payload.error ?? message;
    } catch {
      // Keep the raw response text when the error body is not JSON.
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}

export function getProjects() {
  return apiRequest<Project[]>("/api/projects");
}

export function createProject(payload: CreateProjectRequest) {
  return apiRequest<Project>("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export function getProjectWorkspace(projectId: string) {
  return apiRequest<ProjectWorkspaceResponse>(`/api/projects/${projectId}`);
}

export async function uploadDataset(projectId: string, file: File) {
  const formData = new FormData();
  formData.set("file", file);

  return apiRequest<Dataset>(`/api/projects/${projectId}/datasets`, {
    method: "POST",
    body: formData
  });
}

export function createRunConfig(projectId: string, payload: CreateRunConfigRequest) {
  return apiRequest<RunConfig>(`/api/projects/${projectId}/run-configs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export function startRun(projectId: string, payload: { datasetId: string; runConfigId: string; apiKey: string }) {
  return apiRequest<StartRunResponse>(`/api/projects/${projectId}/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export function startCiRun(
  projectId: string,
  payload: {
    datasetId: string;
    runConfigId: string;
    pullRequest?: { number: number; sha: string; branch: string };
  },
  token: string
) {
  return apiRequest<StartCiRunResponse>(`/api/ci/${projectId}/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
}

export function getRunStatus(runId: string) {
  return apiRequest<RunStatusResponse>(`/api/runs/${runId}`);
}

export function createCiToken(projectId: string, payload: CreateCiTokenRequest) {
  return apiRequest<CreateCiTokenResponse>(`/api/projects/${projectId}/ci-tokens`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export function getRunReport(runId: string) {
  return apiRequest<RunReport>(`/api/runs/${runId}/report`);
}

export function getRunFailures(runId: string) {
  return apiRequest<FailureRecord[]>(`/api/runs/${runId}/failures`);
}

export function getCiSummary(runId: string, token: string) {
  return apiRequest<RunSummaryResponse>(`/api/ci/${runId}/summary`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}
