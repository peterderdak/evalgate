import { getSupabaseServerClient } from "../supabase/client";
import * as local from "./local-store";
import * as remote from "./supabase-store";

function useRemoteStore() {
  return Boolean(getSupabaseServerClient());
}

export function getStorageMode() {
  return useRemoteStore() ? "supabase" : "local";
}

export async function saveDatasetFile(...args: Parameters<typeof local.saveDatasetFile>) {
  return useRemoteStore() ? remote.saveDatasetFile(...args) : local.saveDatasetFile(...args);
}

export async function readDatasetFile(...args: Parameters<typeof local.readDatasetFile>) {
  return useRemoteStore() ? remote.readDatasetFile(...args) : local.readDatasetFile(...args);
}

export async function saveReportFile(...args: Parameters<typeof local.saveReportFile>) {
  return useRemoteStore() ? remote.saveReportFile(...args) : local.saveReportFile(...args);
}

export async function createProject(...args: Parameters<typeof local.createProject>) {
  return useRemoteStore() ? remote.createProject(...args) : local.createProject(...args);
}

export async function listProjects(...args: Parameters<typeof local.listProjects>) {
  return useRemoteStore() ? remote.listProjects(...args) : local.listProjects(...args);
}

export async function getProject(...args: Parameters<typeof local.getProject>) {
  return useRemoteStore() ? remote.getProject(...args) : local.getProject(...args);
}

export async function createDataset(...args: Parameters<typeof local.createDataset>) {
  return useRemoteStore() ? remote.createDataset(...args) : local.createDataset(...args);
}

export async function listDatasets(...args: Parameters<typeof local.listDatasets>) {
  return useRemoteStore() ? remote.listDatasets(...args) : local.listDatasets(...args);
}

export async function getDataset(...args: Parameters<typeof local.getDataset>) {
  return useRemoteStore() ? remote.getDataset(...args) : local.getDataset(...args);
}

export async function createRunConfig(...args: Parameters<typeof local.createRunConfig>) {
  return useRemoteStore() ? remote.createRunConfig(...args) : local.createRunConfig(...args);
}

export async function listRunConfigs(...args: Parameters<typeof local.listRunConfigs>) {
  return useRemoteStore() ? remote.listRunConfigs(...args) : local.listRunConfigs(...args);
}

export async function getRunConfig(...args: Parameters<typeof local.getRunConfig>) {
  return useRemoteStore() ? remote.getRunConfig(...args) : local.getRunConfig(...args);
}

export async function createRun(...args: Parameters<typeof local.createRun>) {
  return useRemoteStore() ? remote.createRun(...args) : local.createRun(...args);
}

export async function listRuns(...args: Parameters<typeof local.listRuns>) {
  return useRemoteStore() ? remote.listRuns(...args) : local.listRuns(...args);
}

export async function getRun(...args: Parameters<typeof local.getRun>) {
  return useRemoteStore() ? remote.getRun(...args) : local.getRun(...args);
}

export async function updateRun(...args: Parameters<typeof local.updateRun>) {
  return useRemoteStore() ? remote.updateRun(...args) : local.updateRun(...args);
}

export async function appendCaseResult(...args: Parameters<typeof local.appendCaseResult>) {
  return useRemoteStore() ? remote.appendCaseResult(...args) : local.appendCaseResult(...args);
}

export async function listFailures(...args: Parameters<typeof local.listFailures>) {
  return useRemoteStore() ? remote.listFailures(...args) : local.listFailures(...args);
}

export async function createFailures(...args: Parameters<typeof local.createFailures>) {
  return useRemoteStore() ? remote.createFailures(...args) : local.createFailures(...args);
}

export async function saveRunReport(...args: Parameters<typeof local.saveRunReport>) {
  return useRemoteStore() ? remote.saveRunReport(...args) : local.saveRunReport(...args);
}

export async function getRunReport(...args: Parameters<typeof local.getRunReport>) {
  return useRemoteStore() ? remote.getRunReport(...args) : local.getRunReport(...args);
}

export async function getCaseResults(...args: Parameters<typeof local.getCaseResults>) {
  return useRemoteStore() ? remote.getCaseResults(...args) : local.getCaseResults(...args);
}

export async function getCiTokenByHash(...args: Parameters<typeof local.getCiTokenByHash>) {
  return useRemoteStore() ? remote.getCiTokenByHash(...args) : local.getCiTokenByHash(...args);
}

export async function listCiTokens(...args: Parameters<typeof local.listCiTokens>) {
  return useRemoteStore() ? remote.listCiTokens(...args) : local.listCiTokens(...args);
}

export async function getJobByRunId(...args: Parameters<typeof local.getJobByRunId>) {
  return useRemoteStore() ? remote.getJobByRunId(...args) : local.getJobByRunId(...args);
}

export async function leaseNextJob(...args: Parameters<typeof local.leaseNextJob>) {
  return useRemoteStore() ? remote.leaseNextJob(...args) : local.leaseNextJob(...args);
}

export async function completeJob(...args: Parameters<typeof local.completeJob>) {
  return useRemoteStore() ? remote.completeJob(...args) : local.completeJob(...args);
}

export async function failJob(...args: Parameters<typeof local.failJob>) {
  return useRemoteStore() ? remote.failJob(...args) : local.failJob(...args);
}
