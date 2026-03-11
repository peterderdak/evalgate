# EvalGate Architecture

EvalGate is structured as a Supabase-first monorepo with a web app, worker, shared evaluation engine, and GitHub Action package:

- `apps/web`: Next.js 14 application and Node.js API routes.
- `apps/worker`: DB-backed polling worker for queued evaluation jobs.
- `packages/eval-core`: dataset parsing, structured model execution, metrics, and report generation.
- `packages/shared`: shared domain and API types.
- `packages/db`: SQL schema and migrations.
- `packages/github-action`: TypeScript GitHub Action that triggers CI runs and polls for a gate result.

## Data flow

1. A project is created through the web API.
2. A JSONL dataset is validated and uploaded to Supabase Storage, or the local `.data/` fallback when Supabase is not configured.
3. A run config stores the output schema, thresholds, prompt text, and model settings.
4. Starting a run creates a `runs` row and a `jobs` row with encrypted execution payload.
5. The worker leases pending jobs, loads the dataset, decrypts the API key or falls back to the server key, and calls `eval-core`.
6. Case results, failures, and `report.json` are persisted; `run_results` stores the gate summary and report path.
7. CI callers use the CI endpoints and the GitHub Action package to poll for pass/fail status.

## Local fallback

If `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are not set, the repository uses `.data/` for metadata and file storage. This fallback exists for development only; the intended production path is Supabase Postgres plus Supabase Storage.
