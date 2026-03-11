# EvalGate

EvalGate is a GitHub-ready monorepo for running structured LLM evaluations and turning them into CI gates. It includes a Next.js 14 UI, Node.js API routes, a shared evaluation engine, Supabase integrations for Postgres and Storage, sample datasets, and workflow examples.

## Stack

- Frontend: Next.js 14, TypeScript, Tailwind CSS
- Backend: Next.js Node.js API routes
- Database: Supabase Postgres
- Storage: Supabase Storage
- Evaluation engine: shared Node.js package in `packages/eval-core`

## Repository layout

```text
apps/web              Next.js app and API routes
packages/eval-core    Evaluation runner, metrics, report generator, CLI
datasets              Sample JSONL datasets
docs                  Architecture and Supabase schema notes
.github/workflows     CI and EvalGate GitHub Action examples
```

## Features

- Create a project
- Upload a JSONL dataset
- Run an evaluation against OpenAI, Anthropic, or a mock provider
- Validate responses with JSON Schema
- Compute `schema_valid_rate`, `enum_accuracy`, `field_level_accuracy`, and `latency_p95`
- Display evaluation results in a simple UI
- Export a GitHub CI gate workflow template

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment variables:

   ```bash
   cp .env.example .env.local
   ```

3. Start the app:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

## Supabase setup

1. Create a Supabase project.
2. Run the SQL in `docs/supabase.sql`.
3. Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
4. Create storage buckets `eval-datasets` and `eval-reports` if they do not already exist.

If Supabase variables are missing, the web app falls back to `.data/` for a local demo mode.

## Running the evaluator

Run the bundled sample dataset with the mock provider:

```bash
npm run eval:sample
```

Run directly against a provider:

```bash
npx evalgate run \
  --dataset datasets/sample-support-tickets.jsonl \
  --provider openai \
  --model gpt-4.1-mini \
  --api-key "$OPENAI_API_KEY" \
  --out .artifacts/report.json
```

## Exporting a GitHub gate

Generate workflow YAML from the CLI:

```bash
npm run export:gate
```

An example workflow is included at `.github/workflows/evalgate-example.yml`.

## Docker

Build and run:

```bash
docker build -t evalgate .
docker run -p 3000:3000 --env-file .env.local evalgate
```

## Pushing to GitHub

The repository is initialized as git. After review:

```bash
git add .
git commit -m "Initial EvalGate scaffold"
git branch -M main
git remote add origin git@github.com:<your-user>/evalgate.git
git push -u origin main
```
