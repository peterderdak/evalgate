# EvalGate Architecture

EvalGate is structured as a CLI-first monorepo with an optional hosted layer:

- `packages/eval-core`: the core product. It owns dataset parsing, structured model execution, metrics, report generation, and the `evalgate` CLI.
- `packages/github-action`: TypeScript GitHub Action for CI gating.
- `packages/shared`: shared domain and API types.
- `packages/db`: SQL schema and migrations.
- `apps/web`: optional Next.js application and API routes for teams that want a browser-based companion app.
- `apps/worker`: optional DB-backed polling worker for hosted queued evaluation jobs.

## CLI-first flow

1. A user creates an EvalGate config with prompt, schema, model, and thresholds.
2. The CLI loads a JSONL dataset from disk.
3. `packages/eval-core` calls the selected provider and validates structured output.
4. EvalGate computes deterministic metrics and writes `report.json`.
5. CI can consume that report directly or use the GitHub Action wrapper.

## Optional hosted flow

1. A project is created through the web API.
2. A JSONL dataset is validated and uploaded to Supabase Storage, or the local `.data/` fallback when Supabase is not configured.
3. A run config stores the output schema, thresholds, prompt text, and model settings.
4. Starting a run creates a `runs` row and a `jobs` row with encrypted execution payload.
5. The worker leases pending jobs, loads the dataset, decrypts the API key or falls back to the server key, and calls `eval-core`.
6. Case results, failures, and `report.json` are persisted; `run_results` stores the gate summary and report path.
7. CI callers use the CI endpoints and the GitHub Action package to poll for pass/fail status.

## Local fallback

If hosted-mode environment variables are not set, the repository uses `.data/` for metadata and file storage. This fallback exists for development only; the intended hosted production path is Supabase Postgres plus Supabase Storage.
