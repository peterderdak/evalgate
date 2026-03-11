import { beforeEach, describe, expect, it, vi } from "vitest";

const { runOneJob } = vi.hoisted(() => ({
  runOneJob: vi.fn()
}));

vi.mock("../src/job-runner", () => ({
  runOneJob
}));

import { pollOnce } from "../src/poller";

describe("pollOnce", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when a job executes cleanly", async () => {
    runOneJob.mockResolvedValueOnce(null);

    await expect(pollOnce()).resolves.toBe(true);
  });

  it("logs and returns false when a job throws", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    runOneJob.mockRejectedValueOnce(new Error("boom"));

    await expect(pollOnce()).resolves.toBe(false);
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});
