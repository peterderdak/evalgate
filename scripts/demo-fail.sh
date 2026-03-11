#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Running ezEval fail demo..."
echo "This demo is expected to fail the gate because latency_p95_max_ms is set to 1 ms."
echo

if pnpm ezeval run \
  --dataset ./examples/ticket-triage/dataset.jsonl \
  --config ./examples/ticket-triage/demo-fail.ezeval.json \
  --out ./.artifacts/demo-fail-report.json \
  --fail-on-gate; then
  echo
  echo "Unexpected result: the fail demo passed."
  exit 1
fi

echo
echo "Fail demo behaved as expected."
echo "Report: $ROOT_DIR/.artifacts/demo-fail-report.json"
