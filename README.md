# EvalGate

EvalGate is a CLI release gate for structured AI changes.

It answers one question:

**Is this prompt or model change still safe to ship?**

It runs a saved dataset against a model, validates the output against a JSON schema, computes deterministic metrics, and writes a `report.json` artifact with a pass/fail gate.

## Best Fit

EvalGate is most useful when your AI feature must return predictable JSON.

Good fits:

- classification
- structured extraction
- tagging and routing
- any single-turn workflow with a strict output contract

Not a great fit:

- open-ended chat quality
- agent behavior across many steps
- subjective writing or tone evaluation

## Why Teams Use It

Most teams still test prompt changes manually:

- they try a few examples by hand
- they do not save those examples as a dataset
- they do not define a consistent pass/fail bar
- release decisions become opinion-driven

EvalGate turns that into a repeatable release gate:

- same dataset every run
- same schema every run
- same thresholds every run
- same `report.json` artifact every run

## Metrics

EvalGate currently computes:

- `schema_valid_rate`
- `enum_accuracy`
- `field_level_accuracy`
- `latency_p95_ms`

## End-to-End Workflow

1. Create a JSONL dataset of representative inputs and expected outputs.
2. Define the prompt, provider, schema, and thresholds in an EvalGate config.
3. Run `evalgate run`.
4. Review `report.json`.
5. Use `--fail-on-gate` in CI to block risky changes.

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

This creates `evalgate.config.json` in the repo root.

### 3. Run the sample

```bash
pnpm evalgate:sample
```

This uses:

- [examples/ticket-triage/dataset.jsonl](./examples/ticket-triage/dataset.jsonl)
- [examples/ticket-triage/config.evalgate.json](./examples/ticket-triage/config.evalgate.json)

The report is written to:

- [report.json](./.artifacts/report.json)

### 4. Run against OpenAI

```bash
export OPENAI_API_KEY=your_key_here

pnpm evalgate:sample:openai
```

### 5. Fail CI when the gate fails

```bash
pnpm evalgate run \
  --dataset ./examples/ticket-triage/dataset.jsonl \
  --config ./examples/ticket-triage/config.evalgate.json \
  --provider openai \
  --model gpt-4.1-mini \
  --fail-on-gate
```

## Example

The repo ships with one complete example:

- [examples/ticket-triage/README.md](./examples/ticket-triage/README.md)

This example evaluates a support-ticket classifier that must return one category:

- `billing`
- `refund`
- `cancellation`
- `technical`
- `unknown`

## Demo

The repo includes a public demo flow with one passing run and one intentionally failing run.

- narrative and recording guide: [docs/demo.md](./docs/demo.md)
- launch copy for repo metadata and sharing: [docs/launch-copy.md](./docs/launch-copy.md)
- passing gate config: [examples/ticket-triage/demo-pass.evalgate.json](./examples/ticket-triage/demo-pass.evalgate.json)
- failing gate config: [examples/ticket-triage/demo-fail.evalgate.json](./examples/ticket-triage/demo-fail.evalgate.json)

Run the pass demo:

```bash
pnpm demo:pass
```

Run the fail demo:

```bash
pnpm demo:fail
```

## Dataset Format

EvalGate accepts JSONL only.

Each line must contain:

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

Example:

- [examples/ticket-triage/config.evalgate.json](./examples/ticket-triage/config.evalgate.json)

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
pnpm evalgate:init
```

Run an eval:

```bash
pnpm evalgate run --dataset ./my-dataset.jsonl --config ./evalgate.config.json
```

Write the report to a custom path:

```bash
pnpm evalgate run \
  --dataset ./my-dataset.jsonl \
  --config ./evalgate.config.json \
  --out ./reports/report.json
```

Override provider or model:

```bash
pnpm evalgate run \
  --dataset ./my-dataset.jsonl \
  --config ./evalgate.config.json \
  --provider openai \
  --model gpt-4.1-mini
```

## CI Example

A GitHub Actions example lives at:

- [docs/github-actions.yml](./docs/github-actions.yml)

## Repo Layout

```text
bin/                     CLI entrypoint
src/                     evaluation engine
tests/                   unit tests
examples/ticket-triage/  complete sample use case
docs/                    demo and CI docs
scripts/                 reproducible demo scripts
```

## Environment

See [.env.example](./.env.example).

For live provider runs, the main variable is:

- `OPENAI_API_KEY`

## Docker

```bash
docker build -t evalgate .
docker run --rm -v "$PWD:/workspace" -w /workspace evalgate run --dataset ./examples/ticket-triage/dataset.jsonl --config ./examples/ticket-triage/config.evalgate.json
```

## Local Checks

```bash
pnpm test
pnpm build
pnpm evalgate:sample
pnpm demo:pass
pnpm demo:fail
```
