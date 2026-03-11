# Demo Guide

This is the fastest way to demo EvalGate to a technical PM, founder, or engineering lead.

## Goal

Show two things:

1. a passing release gate
2. a failing release gate

That is enough to explain the product.

## Demo Assets

- dataset: [examples/ticket-triage/dataset.jsonl](/Users/peterderdak/Documents/Playground/examples/ticket-triage/dataset.jsonl)
- passing config: [examples/ticket-triage/demo-pass.evalgate.json](/Users/peterderdak/Documents/Playground/examples/ticket-triage/demo-pass.evalgate.json)
- failing config: [examples/ticket-triage/demo-fail.evalgate.json](/Users/peterderdak/Documents/Playground/examples/ticket-triage/demo-fail.evalgate.json)
- pass script: [scripts/demo-pass.sh](/Users/peterderdak/Documents/Playground/scripts/demo-pass.sh)
- fail script: [scripts/demo-fail.sh](/Users/peterderdak/Documents/Playground/scripts/demo-fail.sh)

## Narrative

Use this framing:

1. Teams still QA prompt changes manually.
2. That makes release decisions subjective.
3. EvalGate turns that into a repeatable release gate.
4. A dataset, schema, and thresholds become the contract.

## Demo Flow

### 1. Show the dataset

Open [examples/ticket-triage/dataset.jsonl](/Users/peterderdak/Documents/Playground/examples/ticket-triage/dataset.jsonl).

What to say:

"Each line is one real test case with an input payload and an expected structured output."

### 2. Show the passing config

Open [examples/ticket-triage/demo-pass.evalgate.json](/Users/peterderdak/Documents/Playground/examples/ticket-triage/demo-pass.evalgate.json).

What to say:

"This file defines the prompt, provider, schema, and pass/fail thresholds."

### 3. Run the passing demo

```bash
pnpm demo:pass
```

What to say:

"This is the healthy case. The outputs validate, the labels are correct, and the gate passes."

### 4. Show the passing report

Open [demo-pass-report.json](/Users/peterderdak/Documents/Playground/.artifacts/demo-pass-report.json).

Point out:

- `pass: true`
- `schema_valid_rate`
- `enum_accuracy`
- `field_level_accuracy`
- `latency_p95_ms`

### 5. Show the failing config

Open [examples/ticket-triage/demo-fail.evalgate.json](/Users/peterderdak/Documents/Playground/examples/ticket-triage/demo-fail.evalgate.json).

What to say:

"Now I tighten the latency gate so the release should be blocked."

### 6. Run the failing demo

```bash
pnpm demo:fail
```

What to say:

"This run still executes, but the gate fails and CI would stop the release."

### 7. Show the failing report

Open [demo-fail-report.json](/Users/peterderdak/Documents/Playground/.artifacts/demo-fail-report.json).

Point out:

- `pass: false`
- `gate_reasons`
- the threshold that was violated

## 90-Second Version

1. show the dataset
2. show the passing config
3. run `pnpm demo:pass`
4. run `pnpm demo:fail`
5. close with: "EvalGate gives PMs and engineers one repeatable release decision instead of manual prompt QA."

## Recording Tips

- keep the terminal zoomed in
- use the pass demo first
- spend more time on the release decision than on implementation details
- position EvalGate as a lightweight release gate, not a full AI eval platform
