# EvalGate Walkthrough

This is the repo-level walkthrough to read before you record a demo.

It shows:

- the main files you should open
- what each file is for
- the commands to run
- the outputs EvalGate writes
- how baseline comparison fits into the workflow

## What the Repo Contains

The most important paths are:

- [dataset.jsonl](./examples/ticket-triage/dataset.jsonl): example evaluation dataset
- [config.evalgate.json](./examples/ticket-triage/config.evalgate.json): example run config
- [demo-pass.evalgate.json](./examples/ticket-triage/demo-pass.evalgate.json): passing gate demo config
- [demo-fail.evalgate.json](./examples/ticket-triage/demo-fail.evalgate.json): intentionally failing gate demo config
- [evalgate.ts](./bin/evalgate.ts): CLI entrypoint
- [baseline.ts](./src/baseline.ts): baseline create/compare logic
- [reporter.ts](./src/reporter.ts): report, summary, JUnit, and SARIF generation

## File 1: Dataset

Open [dataset.jsonl](./examples/ticket-triage/dataset.jsonl).

Example content:

```jsonl
{"id":"case_001","input":{"ticket_text":"Customer says they were double charged"},"expected":{"category":"billing"}}
{"id":"case_002","input":{"ticket_text":"Refund me now for the duplicate payment"},"expected":{"category":"refund"}}
{"id":"case_003","input":{"ticket_text":"Please cancel my subscription immediately"},"expected":{"category":"cancellation"}}
{"id":"case_004","input":{"ticket_text":"The mobile app crashes every time I upload a photo"},"expected":{"category":"technical"}}
```

What this does:

- each line is one test case
- `input` is what the model sees
- `expected` is the structured answer EvalGate checks against

## File 2: Config

Open [config.evalgate.json](./examples/ticket-triage/config.evalgate.json).

Example content:

```json
{
  "name": "Support Ticket Classifier",
  "promptText": "Classify the support ticket into exactly one category: billing, refund, cancellation, technical, or unknown. Return valid JSON only.",
  "modelProvider": "mock",
  "modelName": "mock-classifier",
  "schema": {
    "type": "object",
    "properties": {
      "category": {
        "type": "string",
        "enum": ["billing", "refund", "cancellation", "technical", "unknown"]
      }
    },
    "required": ["category"],
    "additionalProperties": false
  },
  "thresholds": {
    "schema_valid_rate_min": 0.95,
    "enum_accuracy_min": 0.9,
    "field_level_accuracy_min": 0.9,
    "latency_p95_max_ms": 2500
  }
}
```

What this does:

- defines the prompt
- picks the provider and model
- defines the JSON schema
- defines the release thresholds

## Step 1: Run an Eval

Run:

```bash
pnpm evalgate run \
  --dataset ./examples/ticket-triage/dataset.jsonl \
  --config ./examples/ticket-triage/config.evalgate.json \
  --output-dir ./.artifacts/walkthrough
```

Example terminal output:

```text
Eval complete.
Pass: yes
Schema valid rate: 1
Enum accuracy: 1
Field accuracy: 1
Latency p95 (ms): 41
Report: /.../.artifacts/walkthrough/report.json
Summary: /.../.artifacts/walkthrough/summary.md
JUnit: /.../.artifacts/walkthrough/junit.xml
```

## Step 2: Inspect report.json

Open [report.json](./.artifacts/report.json).

Example shape:

```json
{
  "run_id": "cli_run_1710200000000",
  "pass": true,
  "schema_version": "1.0",
  "tool_version": "0.1.0",
  "provider": "mock",
  "model": "mock-classifier",
  "prompt_version": null,
  "dataset_path": "/absolute/path/to/dataset.jsonl",
  "dataset_sha256": "22578b59...",
  "config_sha256": "e94119e2...",
  "git_sha": "791066f...",
  "git_branch": "main",
  "started_at": "2026-03-12T03:29:13.593Z",
  "finished_at": "2026-03-12T03:29:13.727Z",
  "duration_ms": 134,
  "metrics": {
    "schema_valid_rate": 1,
    "enum_accuracy": 1,
    "field_level_accuracy": 1,
    "latency_p95_ms": 41
  },
  "failure_counts_by_type": {
    "schema_invalid": 0,
    "wrong_enum": 0,
    "field_mismatch": 0,
    "missing_field": 0,
    "timeout": 0,
    "provider_error": 0,
    "parse_error": 0
  }
}
```

What this is for:

- machine-readable artifact
- complete run metadata
- source of truth for baselines and CI

## Step 3: Inspect summary.md

Open [summary.md](./.artifacts/with-baseline/summary.md).

Example content:

```md
# EvalGate Summary

- Gate: **PASS**
- Regression: **no regression**
- Provider / Model: `mock` / `mock-classifier`

## Metrics

| Metric | Current | Baseline | Delta | Status |
| --- | --- | --- | --- | --- |
| schema_valid_rate | 1.0000 | 1.0000 | +0.0000 | unchanged |
| enum_accuracy | 1.0000 | 1.0000 | +0.0000 | unchanged |
| field_level_accuracy | 1.0000 | 1.0000 | +0.0000 | unchanged |
| latency_p95_ms | 42 ms | 41 ms | +1 ms | unchanged |
```

What this is for:

- human-readable run summary
- easiest artifact to show in a demo
- easiest artifact to share with PMs or teammates

## Step 4: Inspect junit.xml

Open [junit.xml](./.artifacts/extended/junit.xml).

Example content:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="EvalGate" tests="5" failures="0">
  <testcase classname="EvalGate.mock" name="case_001" time="0.027"></testcase>
  <testcase classname="EvalGate.mock" name="case_002" time="0.029"></testcase>
  <testcase classname="EvalGate.mock" name="case_003" time="0.041"></testcase>
  <testcase classname="EvalGate.mock" name="case_004" time="0.020"></testcase>
  <testcase classname="EvalGate" name="gate" time="0.134"></testcase>
</testsuite>
```

What this is for:

- CI systems that understand JUnit
- test dashboards
- making aggregated gate failures visible to CI tools

## Step 5: Optional SARIF

Run:

```bash
pnpm evalgate run \
  --dataset ./examples/ticket-triage/dataset.jsonl \
  --config ./examples/ticket-triage/config.evalgate.json \
  --output-dir ./.artifacts/extended \
  --formats summary,junit,sarif
```

Open [sarif.json](./.artifacts/extended/sarif.json).

Example shape:

```json
{
  "version": "2.1.0",
  "$schema": "https://json.schemastore.org/sarif-2.1.0.json",
  "runs": [
    {
      "tool": {
        "driver": {
          "name": "EvalGate",
          "version": "0.1.0"
        }
      },
      "results": []
    }
  ]
}
```

What this is for:

- code scanning style tooling
- platforms that already ingest SARIF

## Step 6: Create a Baseline

Run:

```bash
pnpm evalgate baseline create \
  --from ./.artifacts/report.json \
  --out ./.artifacts/baseline.json
```

Open [baseline.json](./.artifacts/baseline.json).

Example shape:

```json
{
  "schema_version": "1.0",
  "created_at": "2026-03-12T03:22:02.017Z",
  "source_report": {
    "run_id": "cli_run_1710200000000",
    "provider": "mock",
    "model": "mock-classifier",
    "dataset_sha256": "22578b59...",
    "config_sha256": "e94119e2..."
  },
  "metrics": {
    "schema_valid_rate": 1,
    "enum_accuracy": 1,
    "field_level_accuracy": 1,
    "latency_p95_ms": 41
  }
}
```

What this is for:

- snapshotting a known-good run
- comparing a candidate prompt or model against that snapshot later

## Step 7: Compare Against Baseline

Run:

```bash
pnpm evalgate compare \
  --report ./.artifacts/report.json \
  --baseline ./.artifacts/baseline.json
```

Example terminal output:

```text
Comparison vs baseline:
Metric                Current  Baseline  Delta    Status
schema_valid_rate     1.0000   1.0000    +0.0000  unchanged
enum_accuracy         1.0000   1.0000    +0.0000  unchanged
field_level_accuracy  1.0000   1.0000    +0.0000  unchanged
latency_p95_ms        42       41        +1       unchanged

No regression detected versus baseline.
```

What this is for:

- seeing absolute metrics and deltas in one place
- comparing a candidate run against a previous run without editing any files by hand

## Step 8: Gate on Regression

Run:

```bash
pnpm evalgate run \
  --dataset ./examples/ticket-triage/dataset.jsonl \
  --config ./examples/ticket-triage/config.evalgate.json \
  --baseline ./.artifacts/baseline.json \
  --fail-on-regression
```

What this is for:

- making CI fail when a candidate run is worse than the saved baseline

## Suggested Demo Order

If you want the simplest narrative:

1. show [dataset.jsonl](./examples/ticket-triage/dataset.jsonl)
2. show [config.evalgate.json](./examples/ticket-triage/config.evalgate.json)
3. run the sample eval
4. show `report.json`
5. show `summary.md`
6. create `baseline.json`
7. run `compare`
8. optionally show `junit.xml` and `sarif.json`

That gives you a full story:

- what goes in
- what command runs
- what artifacts come out
- how a team turns one good run into a reusable baseline
