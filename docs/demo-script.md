# EvalGate Demo Script

This is the fastest credible way to demo EvalGate to a technical PM, founder, or engineering lead.

Goal:

- show a passing release gate
- show a failing release gate
- explain why the tool saves time

Everything in this demo uses real repo assets:

- dataset: [datasets/sample-support-tickets.jsonl](/Users/peterderdak/Documents/Playground/datasets/sample-support-tickets.jsonl)
- pass config: [docs/demo-pass.evalgate.json](/Users/peterderdak/Documents/Playground/docs/demo-pass.evalgate.json)
- fail config: [docs/demo-fail.evalgate.json](/Users/peterderdak/Documents/Playground/docs/demo-fail.evalgate.json)

## Demo Setup

Install dependencies once:

```bash
corepack enable
pnpm install
```

## Recommended Narrative

Use this framing:

1. "Teams ship prompt and model changes all the time, but most of them still QA those changes manually."
2. "EvalGate turns that into a repeatable release gate."
3. "You save a dataset, define the expected JSON output, set thresholds, and run one command."
4. "If quality drops, the gate fails and you stop the release."

## Demo Flow

### 1. Show the dataset

Open [datasets/sample-support-tickets.jsonl](/Users/peterderdak/Documents/Playground/datasets/sample-support-tickets.jsonl).

What to say:

"Each line is one test case. It has an input payload and the expected structured output. This becomes the saved contract for the AI feature."

### 2. Show the pass config

Open [docs/demo-pass.evalgate.json](/Users/peterderdak/Documents/Playground/docs/demo-pass.evalgate.json).

What to say:

"This file defines the prompt, provider, schema, and pass/fail thresholds. This is the release policy."

### 3. Run the passing demo

```bash
bash ./scripts/demo-pass.sh
```

What to say:

"This is the healthy case. The outputs match the schema, the labels are correct, latency is acceptable, and the gate passes."

### 4. Show the pass report

Open [demo-pass-report.json](/Users/peterderdak/Documents/Playground/.artifacts/demo-pass-report.json).

Point out:

- `pass: true`
- `schema_valid_rate`
- `enum_accuracy`
- `field_level_accuracy`
- `latency_p95_ms`

### 5. Show the fail config

Open [docs/demo-fail.evalgate.json](/Users/peterderdak/Documents/Playground/docs/demo-fail.evalgate.json).

What to say:

"Now I am using the same dataset and the same task, but I tightened the latency gate so the release should be blocked."

### 6. Run the failing demo

```bash
bash ./scripts/demo-fail.sh
```

What to say:

"This time the command intentionally returns a failing gate. In CI, that non-zero exit would block the merge."

### 7. Show the fail report

Open [demo-fail-report.json](/Users/peterderdak/Documents/Playground/.artifacts/demo-fail-report.json).

Point out:

- `pass: false`
- `gate_reasons`
- the threshold that was violated

## 90-Second Version

If you need a shorter version:

1. show the dataset
2. show the config
3. run `bash ./scripts/demo-pass.sh`
4. run `bash ./scripts/demo-fail.sh`
5. say: "EvalGate gives PMs and engineers one repeatable release decision instead of manual prompt QA."

## Best Audience Fit

This demo works best for teams doing:

- classification
- structured extraction
- routing/tagging

It is less compelling for:

- open-ended chat
- agent workflows
- subjective writing quality

## Recording Tips

- Keep the terminal zoomed in and clean.
- Use the pass demo first, then the fail demo.
- Spend more time on the problem and release decision than on implementation details.
- Do not oversell it as a general AI eval platform. Position it as a lightweight release gate for structured AI outputs.
