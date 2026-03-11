import type { CiToken, Thresholds } from "./types";

export type CreateProjectRequest = {
  name: string;
  description: string;
  templateType: string;
  defaultSchema?: Record<string, unknown>;
  defaultThresholds?: Thresholds;
};

export type CreateRunConfigRequest = {
  name: string;
  promptText: string;
  promptVersion?: string;
  modelProvider: string;
  modelName: string;
  schema: Record<string, unknown>;
  thresholds: Thresholds;
};

export type StartRunRequest = {
  datasetId: string;
  runConfigId: string;
  apiKey: string;
};

export type StartCiRunRequest = {
  datasetId: string;
  runConfigId: string;
  pullRequest?: {
    number: number;
    sha: string;
    branch: string;
  };
};

export type CreateCiTokenRequest = {
  label?: string;
};

export type CreateCiTokenResponse = {
  token: CiToken;
  plaintextToken: string;
};
