# EvalGate

EvalGate is a pnpm monorepo for running structured LLM evaluations, storing results in Supabase, and turning deterministic thresholds into CI release gates.

## Stack

- Frontend: Next.js 14, TypeScript, Tailwind CSS
- Backend: Next.js App Router API routes
- Worker: Node.js polling worker
- Database: Supabase Postgres
- Storage: Supabase Storage
- Evaluation engine: shared TypeScript package in `packages/eval-core`
- CI integration: TypeScript GitHub Action in `packages/github-action`

## Repository Layout

```text
apps/web              Next.js app and API routes
apps/worker           Background job poller
packages/db           SQL schema and migrations
packages/eval-core    Dataset parser, runner, metrics, report generator
packages/github-action GitHub Action for CI gating
packages/shared       Shared API and domain types
datasets              Sample JSONL datasets
docs                  Architecture and Supabase setup
.github/workflows     Repository CI and CI gating examples
```

## Current MVP Foundations

- Project, dataset, run-config, run, report, and job domain models
- JSONL dataset validation with a 200-case limit
- OpenAI structured-output evaluation runner
- Deterministic metrics:
  - `schema_valid_rate`
  - `enum_accuracy`
  - `field_level_accuracy`
  - `latency_p95_ms`
- `report.json` generation and storage
- Supabase-first persistence with local `.data/` fallback for development
- Separate worker process with a DB-backed jobs table
- CI trigger and CI summary endpoints

## Getting Started

1. Enable Corepack and install dependencies:

   ```bash
   corepack enable
   pnpm install
   ```

2. Copy environment variables:

   ```bash
   cp .env.example .env.local
   ```

3. Start the web app:

   ```bash
   pnpm dev
   ```

4. Start the worker in a second terminal if you disable inline processing:

   ```bash
   pnpm worker
   ```

## Environment

Key variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_BUCKET_DATASETS`
- `SUPABASE_BUCKET_REPORTS`
- `OPENAI_API_KEY`
- `EVALGATE_JOB_SECRET`
- `EVALGATE_INLINE_WORKER`

If Supabase credentials are not set, the repository falls back to local JSON metadata and filesystem storage under `.data/`.
Set `EVALGATE_INLINE_WORKER=true` only for quick local development when you do not want to run the worker process separately.

## Supabase Setup

1. Create a Supabase project.
2. Run the SQL in `docs/supabase.sql`.
3. Ensure storage buckets `eval-datasets` and `eval-reports` exist.
4. Set the Supabase and OpenAI environment variables in `.env.local`.

## Sample Evaluation

Run the sample dataset against OpenAI:

```bash
pnpm eval:sample
```

This writes the output report to `.artifacts/report.json`.

## CI Gating

Repository CI is defined in `.github/workflows/ci.yml`.

An example EvalGate gating workflow is defined in `.github/workflows/evalgate-example.yml`.

The custom GitHub Action package lives in `packages/github-action`.

CI tokens are created from the project CI screen or the `POST /api/projects/:projectId/ci-tokens` route. Plaintext tokens are shown once, stored only as hashes, and must be passed to both:

- `POST /api/ci/:projectId/run`
- `GET /api/ci/:runId/summary`

The GitHub Action package sends pull request metadata when available, polls the authenticated summary route until the run finishes, and fails the job if the EvalGate gate fails.

## Docker

```bash
docker build -t evalgate .
docker run -p 3000:3000 --env-file .env.local evalgate
```
