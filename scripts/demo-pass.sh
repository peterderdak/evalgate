#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Running EvalGate pass demo..."

pnpm evalgate run \
  --dataset ./datasets/sample-support-tickets.jsonl \
  --config ./docs/demo-pass.evalgate.json \
  --out ./.artifacts/demo-pass-report.json \
  --fail-on-gate

echo
echo "Pass demo finished."
echo "Report: $ROOT_DIR/.artifacts/demo-pass-report.json"
