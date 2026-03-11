# EvalGate Architecture

EvalGate is a small monorepo with one application and one shared package:

- `apps/web`: Next.js 14 application with Tailwind UI and Node.js API routes.
- `packages/eval-core`: reusable evaluation runner, metrics logic, report generator, and CLI.
- `datasets`: versioned JSONL datasets for local runs and CI.
- `.github/workflows`: base CI plus an example evaluation gate workflow.

## Data flow

1. A project is created through the web API.
2. A JSONL dataset is uploaded to Supabase Storage or local fallback storage.
3. The evaluation API loads dataset records and calls the shared `runEvaluation` runner.
4. The runner prompts an LLM, parses JSON, validates against JSON Schema, and computes aggregate metrics.
5. Reports are stored and returned to the UI together with a generated GitHub Action gate template.

## Local fallback

If `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are not set, the app uses `.data/` in the repository for a local demo mode. This keeps the repository runnable without external setup while preserving Supabase as the primary persistence layer.
