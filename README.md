# EvalGate

EvalGate is a **CLI-first evaluation tool for AI features**.

It helps product and engineering teams answer one simple question before they ship a prompt or model change:

**"Did quality stay good enough to release?"**

EvalGate runs a dataset of examples against a model, validates the output against a JSON schema, computes deterministic metrics, and writes a `report.json` file you can use locally or in CI.

## The Use Case

Use EvalGate when your team is shipping an AI feature such as:

- support ticket classification
- structured extraction from emails, PDFs, or forms
- routing or tagging workflows
- any prompt that must return predictable JSON

This is especially useful when a product manager, designer, or engineer wants to know:

- did the new prompt get better or worse?
- did a model swap break output quality?
- is the output still valid JSON?
- should this pull request ship or fail?

## The Problem We Solve

Most teams test AI changes informally.

They tweak a prompt, try a few examples by hand, and decide it "looks fine." That breaks down fast:

- results are inconsistent
- nobody remembers which examples were tested
- quality drops are caught late
- model changes silently break downstream workflows
- release decisions become opinion-based instead of evidence-based

EvalGate turns that into a repeatable process.

## The Value We Create

EvalGate gives teams a lightweight release gate for AI features:

- run the same dataset every time
- validate outputs against a schema
- measure quality with deterministic metrics
- write a report anyone can review
- fail CI when thresholds are missed

Instead of debating whether a prompt "feels better," the team gets a report with pass/fail evidence.

## Why This Saves Time

For product and dev teams, EvalGate saves time in four ways:

1. It replaces manual spot-checking with one repeatable command.
2. It catches regressions before QA, support, or customers find them.
3. It gives PMs and engineers a shared report instead of ad hoc Slack threads.
4. It reduces rework caused by shipping prompt/model changes without a contract.

In practice, that means less time spent:

- rerunning the same examples by hand
- arguing about whether quality changed
- debugging bad releases after deployment
- rebuilding trust in AI features after regressions

## What You Get

EvalGate currently computes:

- `schema_valid_rate`
- `enum_accuracy`
- `field_level_accuracy`
- `latency_p95_ms`

And it writes a `report.json` file with:

- pass/fail decision
- summary counts
- metrics
- thresholds
- failure examples

## 5-Minute Quickstart

If you can copy a file and run a command, you can use EvalGate.

### 1. Install dependencies

```bash
corepack enable
pnpm install
```

### 2. Create a starter config

```bash
pnpm evalgate:init
```

This creates `evalgate.config.json` in your repo root.

### 3. Run the sample evaluation

```bash
pnpm evalgate run --dataset ./datasets/sample-support-tickets.jsonl --config ./evalgate.config.json
```

This writes a report to `.artifacts/report.json`.

### 4. Open the report

```bash
cat ./.artifacts/report.json
```

### 5. Run against OpenAI instead of the mock provider

```bash
export OPENAI_API_KEY=your_key_here
pnpm evalgate run \
  --dataset ./datasets/sample-support-tickets.jsonl \
  --config ./evalgate.config.json \
  --provider openai \
  --model gpt-4.1-mini
```

## What the Dataset Looks Like

EvalGate expects **JSONL**.

Each line is one test case:

```jsonl
{"id":"case_001","input":{"ticket_text":"Customer says they were double charged"},"expected":{"category":"billing"}}
{"id":"case_002","input":{"ticket_text":"Please cancel my subscription immediately"},"expected":{"category":"cancellation"}}
```

Rules:

- one valid JSON object per line
- each line must include `input`
- each line must include `expected`
- `metadata` is optional

## What the Config Looks Like

The CLI runs from a simple JSON config file.

Example: [docs/ticket-triage.evalgate.json](/Users/peterderdak/Documents/Playground/docs/ticket-triage.evalgate.json)

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

## Core CLI Commands

Create a starter config:

```bash
pnpm evalgate init --template ticket-triage --out ./evalgate.config.json
```

Run an eval:

```bash
pnpm evalgate run --dataset ./my-dataset.jsonl --config ./evalgate.config.json
```

Write the report somewhere specific:

```bash
pnpm evalgate run \
  --dataset ./my-dataset.jsonl \
  --config ./evalgate.config.json \
  --out ./reports/report.json
```

Override provider or model without editing the config:

```bash
pnpm evalgate run \
  --dataset ./my-dataset.jsonl \
  --config ./evalgate.config.json \
  --provider openai \
  --model gpt-4.1-mini
```

## Non-Technical User Workflow

The simplest workflow for a PM or non-technical operator is:

1. Duplicate the starter config.
2. Put example inputs and expected outputs into a `.jsonl` file.
3. Run one command.
4. Review `report.json`.
5. Decide whether the prompt/model change should ship.

That is the core EvalGate promise: **clear release evidence without building a full internal AI platform**.

## Optional: Web App and Hosted Mode

This repository still contains a web app, API routes, worker, Supabase integration, and GitHub Action support.

Those parts are useful if you want:

- multi-user project management
- a hosted control plane
- browser-based dataset uploads
- report screens
- CI token management

But they are **not required** to use EvalGate as an evaluation tool.

If your goal is the smallest possible useful product, start with the CLI.

## Repository Layout

```text
apps/web                 Optional web app and API routes
apps/worker              Optional background worker
packages/db              SQL schema and migrations
packages/eval-core       CLI, dataset parser, runner, metrics, report generator
packages/github-action   GitHub Action for CI gating
packages/shared          Shared API and domain types
datasets                 Sample JSONL dataset
docs                     Example config and Supabase setup
.github/workflows        CI examples
```

## Sample Commands

Run the sample dataset with the local deterministic mock provider:

```bash
pnpm eval:sample
```

Run the same sample against OpenAI:

```bash
pnpm eval:sample:openai
```

## Environment

The CLI-only path only needs a few variables:

- `OPENAI_API_KEY` for real OpenAI runs

The hosted/web path uses more:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_BUCKET_DATASETS`
- `SUPABASE_BUCKET_REPORTS`
- `EVALGATE_JOB_SECRET`
- `EVALGATE_INLINE_WORKER`
- `EVALGATE_WORKER_POLL_INTERVAL_MS`
- `EVALGATE_JOB_LEASE_TIMEOUT_MS`
- `EVALGATE_PROVIDER_TIMEOUT_MS`
- `EVALGATE_PROVIDER_MAX_RETRIES`

See [.env.example](/Users/peterderdak/Documents/Playground/.env.example).

## Docker

```bash
docker build -t evalgate .
docker run -p 3000:3000 --env-file .env.local evalgate
```
