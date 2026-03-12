#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  compareReportToBaseline,
  createBaselineFromReport,
  formatBaselineComparison,
  getCliTemplate,
  listCliTemplates,
  loadBaseline,
  loadCliConfig,
  loadRunReport,
  OPTIONAL_ARTIFACT_FORMATS,
  type OptionalArtifactFormat,
  requiresProviderApiKey,
  RUN_REPORT_SCHEMA_VERSION,
  runEvaluation,
  writeBaselineJson,
  writeRunArtifacts
} from "../src/index.js";

function getArg(flag: string) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function resolveFromUserCwd(targetPath: string) {
  if (path.isAbsolute(targetPath)) {
    return targetPath;
  }

  return path.resolve(process.env.INIT_CWD ?? process.cwd(), targetPath);
}

function getUserCwd() {
  return process.env.INIT_CWD ?? process.cwd();
}

function parseOutputFormats(value: string | undefined): OptionalArtifactFormat[] {
  if (!value) {
    return ["summary", "junit"];
  }

  if (value.trim().toLowerCase() === "none") {
    return [];
  }

  const formats = value
    .split(",")
    .map((format) => format.trim().toLowerCase())
    .filter((format): format is OptionalArtifactFormat => format.length > 0);

  const invalidFormats = formats.filter(
    (format) => !OPTIONAL_ARTIFACT_FORMATS.includes(format as OptionalArtifactFormat)
  );
  if (invalidFormats.length > 0) {
    throw new Error(
      `Invalid --formats value: ${invalidFormats.join(", ")}. Allowed values: ${OPTIONAL_ARTIFACT_FORMATS.join(", ")}`
    );
  }

  return [...new Set(formats)] as OptionalArtifactFormat[];
}

async function sha256File(filePath: string) {
  const contents = await readFile(filePath);
  return createHash("sha256").update(contents).digest("hex");
}

async function getToolVersion() {
  const packageJsonCandidates = [
    new URL("../package.json", import.meta.url),
    new URL("../../package.json", import.meta.url)
  ];

  for (const packageJsonUrl of packageJsonCandidates) {
    try {
      const packageJson = JSON.parse(await readFile(packageJsonUrl, "utf8")) as { version?: string };
      if (typeof packageJson.version === "string" && packageJson.version.trim().length > 0) {
        return packageJson.version;
      }
    } catch {
      continue;
    }
  }

  return null;
}

function getGitMetadata(cwd: string) {
  try {
    const gitSha = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
    const gitBranch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();

    return {
      gitSha: gitSha.length > 0 ? gitSha : null,
      gitBranch: gitBranch.length > 0 ? gitBranch : null
    };
  } catch {
    return {
      gitSha: null,
      gitBranch: null
    };
  }
}

function usageText() {
  return [
    "Usage:",
    "  evalgate init --template ticket-triage --out evalgate.config.json",
    "  evalgate run --dataset <path> --config <path> [--api-key <key>] [--provider openai|mock] [--model <name>] [--baseline <path>] [--output-dir <dir>] [--formats summary,junit,sarif] [--fail-on-gate] [--fail-on-regression]",
    "  evalgate baseline create --from <report.json> --out <baseline.json>",
    "  evalgate compare --report <report.json> --baseline <baseline.json>",
    `Available templates: ${listCliTemplates().join(", ")}`
  ].join("\n");
}

async function main() {
  const command = process.argv[2];

  if (!command || command === "help" || process.argv.includes("--help") || process.argv.includes("-h")) {
    process.stdout.write(`${usageText()}\n`);
    return;
  }

  if (command === "init") {
    const template = getArg("--template") ?? "ticket-triage";
    const out = resolveFromUserCwd(getArg("--out") ?? "evalgate.config.json");
    const config = getCliTemplate(template);

    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, `${JSON.stringify(config, null, 2)}\n`, "utf8");
    process.stdout.write(`Created ${out} from template "${template}".\n`);
    return;
  }

  if (command === "baseline" && process.argv[3] === "create") {
    const reportPath = getArg("--from");
    const out = resolveFromUserCwd(getArg("--out") ?? "baseline.json");

    if (!reportPath) {
      throw new Error("Missing required flags.\n\nUsage: evalgate baseline create --from <report.json> --out <baseline.json>");
    }

    const resolvedReportPath = resolveFromUserCwd(reportPath);
    const report = await loadRunReport(resolvedReportPath);
    const baseline = createBaselineFromReport(report);

    await writeBaselineJson(out, baseline);
    process.stdout.write(`Created baseline from ${resolvedReportPath}\n`);
    process.stdout.write(`Baseline: ${out}\n`);
    return;
  }

  if (command === "compare") {
    const reportPath = getArg("--report");
    const baselinePath = getArg("--baseline");

    if (!reportPath || !baselinePath) {
      throw new Error("Missing required flags.\n\nUsage: evalgate compare --report <report.json> --baseline <baseline.json>");
    }

    const report = await loadRunReport(resolveFromUserCwd(reportPath));
    const baseline = await loadBaseline(resolveFromUserCwd(baselinePath));
    const comparison = compareReportToBaseline(report, baseline);

    process.stdout.write(`${formatBaselineComparison(comparison)}\n`);
    return;
  }

  if (command === "run") {
    const dataset = getArg("--dataset");
    const configPath = getArg("--config");
    const outFlag = getArg("--out");
    const outputDirFlag = getArg("--output-dir");
    const reportPath = resolveFromUserCwd(outFlag ?? path.join(outputDirFlag ?? ".artifacts", "report.json"));
    const outputDir = resolveFromUserCwd(outputDirFlag ?? path.dirname(reportPath));
    const baselinePath = getArg("--baseline");
    const formats = parseOutputFormats(getArg("--formats"));

    if (!dataset || !configPath) {
      throw new Error("Missing required flags.\n\nUsage: evalgate run --dataset <path> --config <path>");
    }

    const resolvedDataset = resolveFromUserCwd(dataset);
    const resolvedConfigPath = resolveFromUserCwd(configPath);
    const config = await loadCliConfig(resolvedConfigPath);
    const userCwd = getUserCwd();
    const provider = getArg("--provider") ?? config.modelProvider;
    const model = getArg("--model") ?? config.modelName;
    const prompt = getArg("--prompt") ?? config.promptText;
    const promptVersion = getArg("--prompt-version") ?? config.promptVersion;
    const apiKey = getArg("--api-key") ?? process.env.OPENAI_API_KEY;
    const failOnGate = process.argv.includes("--fail-on-gate");
    const failOnRegression = process.argv.includes("--fail-on-regression");
    if (failOnRegression && !baselinePath) {
      throw new Error("--fail-on-regression requires --baseline <path>");
    }
    const [{ gitSha, gitBranch }, datasetSha256, configSha256, toolVersion] = await Promise.all([
      Promise.resolve(getGitMetadata(userCwd)),
      sha256File(resolvedDataset),
      sha256File(resolvedConfigPath),
      getToolVersion()
    ]);

    if (requiresProviderApiKey(provider) && !apiKey) {
      throw new Error(`Provider ${provider} requires --api-key or OPENAI_API_KEY`);
    }

    const report = await runEvaluation({
      runId: `cli_run_${Date.now()}`,
      datasetPath: resolvedDataset,
      apiKey: apiKey ?? "",
      reportContext: {
        schemaVersion: RUN_REPORT_SCHEMA_VERSION,
        toolVersion,
        datasetPath: resolvedDataset,
        datasetSha256,
        configSha256,
        gitSha,
        gitBranch
      },
      runConfig: {
        promptText: prompt,
        promptVersion,
        modelProvider: provider,
        modelName: model,
        schema: config.schema,
        thresholds: config.thresholds
      }
    });

    const comparison = baselinePath
      ? compareReportToBaseline(report.report, await loadBaseline(resolveFromUserCwd(baselinePath)))
      : undefined;

    const artifacts = await writeRunArtifacts({
      outputDir,
      reportPath,
      formats,
      report: report.report,
      caseResults: report.caseResults,
      comparison
    });
    process.stdout.write(`Eval complete.\n`);
    process.stdout.write(`Pass: ${report.pass ? "yes" : "no"}\n`);
    process.stdout.write(`Schema valid rate: ${report.report.metrics.schema_valid_rate}\n`);
    process.stdout.write(`Enum accuracy: ${report.report.metrics.enum_accuracy ?? "n/a"}\n`);
    process.stdout.write(`Field accuracy: ${report.report.metrics.field_level_accuracy}\n`);
    process.stdout.write(`Latency p95 (ms): ${report.report.metrics.latency_p95_ms}\n`);
    process.stdout.write(`Report: ${artifacts.reportJson}\n`);
    if (artifacts.summaryMd) {
      process.stdout.write(`Summary: ${artifacts.summaryMd}\n`);
    }
    if (artifacts.junitXml) {
      process.stdout.write(`JUnit: ${artifacts.junitXml}\n`);
    }
    if (artifacts.sarifJson) {
      process.stdout.write(`SARIF: ${artifacts.sarifJson}\n`);
    }

    if (comparison) {
      process.stdout.write(`\n${formatBaselineComparison(comparison)}\n`);

      if (failOnRegression && comparison.hasRegression) {
        process.exitCode = 1;
      }
    }

    if (failOnGate && !report.pass) {
      process.exitCode = 1;
    }

    return;
  }

  throw new Error(usageText());
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
