#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Running EvalGate pass demo..."

pnpm evalgate run \
  --dataset ./examples/ticket-triage/dataset.jsonl \
  --config ./examples/ticket-triage/demo-pass.evalgate.json \
  --out ./.artifacts/demo-pass-report.json \
  --fail-on-gate

echo
echo "Pass demo passed."
echo "Report written to: $ROOT_DIR/.artifacts/demo-pass-report.json"
