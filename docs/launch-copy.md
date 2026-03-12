# Launch Copy

Use this file when you update the GitHub repo metadata, record the demo, or share EvalGate publicly.

## GitHub Repo Description

Lightweight CLI for gating structured AI changes before release.

## Short Tagline

Ship prompt and model changes with a repeatable pass/fail gate.

## One-Paragraph Product Blurb

EvalGate is a lightweight CLI for teams shipping structured AI features like classification, extraction, routing, and tagging. Instead of testing prompt or model changes by hand, you run a saved JSONL dataset against a schema and release thresholds, then get a `report.json` with deterministic metrics and a clear pass/fail result. It gives PMs and engineers one repeatable way to decide whether an AI change is still safe to ship.

## Demo Intro

Today I’m showing EvalGate, a lightweight CLI for regression-testing structured AI changes before release. The workflow is simple: save a dataset, define the schema and thresholds, run one command, and get a pass/fail release decision. I’ll show one passing run and one failing run so you can see how it helps a team catch risky prompt or model changes before they ship.

## Demo Closing

That’s the core value of EvalGate: one saved dataset, one contract, one repeatable release decision. Instead of manual prompt QA and opinion-driven shipping calls, PMs and engineers get the same evidence in one report.

## Short Share Post

Built `EvalGate`: a lightweight CLI for regression-testing structured AI changes before release.

You give it:

- a JSONL dataset
- a prompt and model
- a JSON schema
- pass/fail thresholds

It gives you:

- deterministic metrics
- a `report.json`
- a release gate you can run locally or in CI

Best fit for structured AI workflows like classification, extraction, routing, and tagging.

## Demo Flow Summary

1. Show the dataset in [dataset.jsonl](./examples/ticket-triage/dataset.jsonl).
2. Show the passing config in [demo-pass.evalgate.json](./examples/ticket-triage/demo-pass.evalgate.json).
3. Run `pnpm demo:pass`.
4. Show the passing report in [demo-pass-report.json](./.artifacts/demo-pass-report.json).
5. Show the failing config in [demo-fail.evalgate.json](./examples/ticket-triage/demo-fail.evalgate.json).
6. Run `pnpm demo:fail`.
7. Show the failing report in [demo-fail-report.json](./.artifacts/demo-fail-report.json).
