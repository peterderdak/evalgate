import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

const originalDataDir = process.env.EVALGATE_DATA_DIR;

afterEach(() => {
  vi.resetModules();
  process.env.EVALGATE_DATA_DIR = originalDataDir;
});

async function loadStore() {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "evalgate-local-store-"));
  process.env.EVALGATE_DATA_DIR = tempDir;
  vi.resetModules();
  const store = await import("../lib/server/local-store");
  return {
    store,
    async cleanup() {
      await rm(tempDir, { recursive: true, force: true });
    }
  };
}

describe("local job storage", () => {
  it("reclaims expired leased jobs", async () => {
    const sandbox = await loadStore();

    try {
      const run = await sandbox.store.createRun({
        projectId: "proj_1",
        datasetId: "ds_1",
        runConfigId: "cfg_1",
        triggerSource: "manual",
        jobPayload: {
          apiKeySource: "none"
        }
      });

      const firstLease = await sandbox.store.leaseNextJob("worker-a", 60000);
      await new Promise((resolve) => setTimeout(resolve, 5));
      const secondLease = await sandbox.store.leaseNextJob("worker-b", 0);

      expect(firstLease?.runId).toBe(run.id);
      expect(secondLease?.runId).toBe(run.id);
      expect(secondLease?.attempts).toBe(2);
      expect(secondLease?.leaseOwner).toBe("worker-b");
    } finally {
      await sandbox.cleanup();
    }
  });

  it("marks terminal failures without requeueing the job", async () => {
    const sandbox = await loadStore();

    try {
      await sandbox.store.createRun({
        projectId: "proj_1",
        datasetId: "ds_1",
        runConfigId: "cfg_1",
        triggerSource: "manual",
        jobPayload: {
          apiKeySource: "none"
        }
      });

      const leased = await sandbox.store.leaseNextJob("worker-a", 60000);
      const failed = await sandbox.store.failJob(leased!.id, "fatal", { retryable: false });

      expect(failed?.status).toBe("failed");
      expect(failed?.leaseOwner).toBeUndefined();
      expect(failed?.leasedAt).toBeUndefined();
    } finally {
      await sandbox.cleanup();
    }
  });
});
