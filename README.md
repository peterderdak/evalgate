# EvalGate

CLI release gate for structured AI changes.

EvalGate runs a saved JSONL dataset against a prompt and model, validates the output against a JSON schema, computes deterministic metrics, and writes artifacts you can use locally or in CI.

Best fit:
- classification
- structured extraction
- tagging and routing

Most valuable use case:
- a team has a prompt or model change for a structured AI feature and needs one repeatable command to decide whether it is still safe to ship

## Quickstart

```bash
corepack enable
pnpm install
pnpm evalgate:sample
```

That sample uses:
- [dataset.jsonl](./examples/ticket-triage/dataset.jsonl)
- [config.evalgate.json](./examples/ticket-triage/config.evalgate.json)

Artifacts are written to:
- `.artifacts/report.json`
- `.artifacts/summary.md`
- `.artifacts/junit.xml`

## Core Commands

Create a starter config:

```bash
pnpm evalgate:init
```

Run an eval:

```bash
pnpm evalgate run --dataset ./my-dataset.jsonl --config ./evalgate.config.json
```

Create a baseline from a finished run:

```bash
pnpm evalgate baseline create --from ./report.json --out ./baseline.json
```

Compare a report to a baseline:

```bash
pnpm evalgate compare --report ./report.json --baseline ./baseline.json
```

Fail on gate or regression:

```bash
pnpm evalgate run \
  --dataset ./my-dataset.jsonl \
  --config ./evalgate.config.json \
  --baseline ./baseline.json \
  --fail-on-gate \
  --fail-on-regression
```

## Output

EvalGate always writes `report.json`.

By default it also writes:
- `summary.md`
- `junit.xml`

Optional:
- `sarif.json` via `--formats summary,junit,sarif`

Useful flags:
- `--output-dir ./artifacts/evalgate`
- `--out ./artifacts/report.json`
- `--formats summary,junit,sarif`

Key report fields:
- `schema_version`
- `tool_version`
- `provider`
- `model`
- `prompt_version`
- `dataset_sha256`
- `config_sha256`
- `git_sha`
- `git_branch`
- `started_at`
- `finished_at`
- `duration_ms`
- `failure_counts_by_type`

## Example

The repo ships with one complete walkthrough:
- [examples/ticket-triage/README.md](./examples/ticket-triage/README.md)

That example shows:
- the dataset file
- the config file
- the exact command to run
- the terminal output
- the generated report artifacts

## CI

GitHub Actions example:
- [docs/github-actions.yml](./docs/github-actions.yml)

## Live Provider

For OpenAI-backed runs:

```bash
export OPENAI_API_KEY=your_key_here
pnpm evalgate:sample:openai
```

See [`.env.example`](./.env.example) for environment variables.

Do not commit generated reports built from sensitive datasets. `report.json`, `summary.md`, and other artifacts can include raw inputs, outputs, and diffs.

## License

MIT. See [LICENSE](./LICENSE).
