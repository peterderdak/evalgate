# EvalGate

EvalGate is a lightweight CLI for testing structured AI outputs before you ship a prompt or model change.

It helps product and engineering teams answer a simple release question:

**Did this AI change stay good enough to ship?**

EvalGate runs a JSONL dataset against a model, validates the output against a JSON schema, computes deterministic metrics, and writes a `report.json` file with a pass/fail gate.

## Who This Is For

EvalGate is built for technical PMs, AI engineers, and small product teams shipping workflows like:

- support ticket classification
- structured extraction from emails, forms, or PDFs
- content tagging and routing
- any prompt that must return predictable JSON

## The Problem

Most teams still evaluate prompt changes manually:

- they test a few examples by hand
- they do not save those examples in one place
- they cannot tell if quality got better or worse
- release decisions become subjective

That works for one demo. It does not work for a product.

## The Value

EvalGate makes prompt QA repeatable:

- same dataset every run
- same schema contract every run
- same threshold checks every run
- same `report.json` artifact every run

Instead of asking whether a change "looks fine," the team gets evidence.

## Why It Saves Time

EvalGate saves product and dev teams time because it:

- replaces manual spot-checking with one command
- catches regressions before they reach QA or customers
- gives PMs and engineers one shared report instead of ad hoc Slack debates
- turns AI release decisions into a simple pass/fail gate

## What EvalGate Measures

EvalGate currently computes:

- `schema_valid_rate`
- `enum_accuracy`
- `field_level_accuracy`
- `latency_p95_ms`

## Quickstart

### 1. Install dependencies

```bash
corepack enable
pnpm install
```

### 2. Create a starter config

```bash
pnpm evalgate:init
```

This creates `evalgate.config.json`.

### 3. Run the sample evaluation

```bash
pnpm evalgate run \
  --dataset ./datasets/sample-support-tickets.jsonl \
  --config ./evalgate.config.json
```

This writes `.artifacts/report.json`.

### 4. Read the report

```bash
cat ./.artifacts/report.json
```

## Run Against OpenAI

```bash
export OPENAI_API_KEY=your_key_here

pnpm evalgate run \
  --dataset ./datasets/sample-support-tickets.jsonl \
  --config ./evalgate.config.json \
  --provider openai \
  --model gpt-4.1-mini
```

## Fail CI When the Gate Fails

Use `--fail-on-gate` when you want the CLI to exit non-zero on a failed run:

```bash
pnpm evalgate run \
  --dataset ./datasets/sample-support-tickets.jsonl \
  --config ./evalgate.config.json \
  --provider openai \
  --model gpt-4.1-mini \
  --fail-on-gate
```

That is the simplest way to use EvalGate in GitHub Actions or any other CI runner.

An example workflow lives at [docs/github-actions-example.yml](/Users/peterderdak/Documents/Playground/docs/github-actions-example.yml).

## Dataset Format

EvalGate accepts **JSONL** only.

Each line must be one JSON object with:

- `input`
- `expected`
- optional `id`
- optional `metadata`

Example:

```jsonl
{"id":"case_001","input":{"ticket_text":"Customer says they were double charged"},"expected":{"category":"billing"}}
{"id":"case_002","input":{"ticket_text":"Please cancel my subscription immediately"},"expected":{"category":"cancellation"}}
```

## Config Format

Example config: [docs/ticket-triage.evalgate.json](/Users/peterderdak/Documents/Playground/docs/ticket-triage.evalgate.json)

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

## CLI Commands

Create a starter config:

```bash
pnpm evalgate init --template ticket-triage --out ./evalgate.config.json
```

Run an eval:

```bash
pnpm evalgate run --dataset ./my-dataset.jsonl --config ./evalgate.config.json
```

Write the report to a custom location:

```bash
pnpm evalgate run \
  --dataset ./my-dataset.jsonl \
  --config ./evalgate.config.json \
  --out ./reports/report.json
```

Override the provider or model at runtime:

```bash
pnpm evalgate run \
  --dataset ./my-dataset.jsonl \
  --config ./evalgate.config.json \
  --provider openai \
  --model gpt-4.1-mini
```

## Suggested PM Workflow

If you are a technical PM, the simplest workflow is:

1. Create a dataset of representative examples.
2. Define the expected JSON output for each case.
3. Create an EvalGate config from the starter template.
4. Run `pnpm evalgate run ...`.
5. Review `report.json`.
6. Decide whether the prompt or model change should ship.

## Repository Layout

```text
packages/eval-core       CLI, runner, validators, metrics, providers, report generator
datasets                 Sample JSONL dataset
docs                     Example config and CI workflow
.github/workflows        Repo CI
```

## Environment

See [.env.example](/Users/peterderdak/Documents/Playground/.env.example).

For real provider runs, you only need:

- `OPENAI_API_KEY`

## Docker

```bash
docker build -t evalgate .
docker run --rm -v "$PWD:/workspace" -w /workspace evalgate run --dataset ./datasets/sample-support-tickets.jsonl --config ./docs/ticket-triage.evalgate.json
```

## Local Validation

These are the main repository checks:

```bash
pnpm test
pnpm build
pnpm eval:sample
```
