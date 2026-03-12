# Ticket Triage Example

Support-ticket classifier example for EvalGate.

This is the clearest place where EvalGate adds value:
- a support team changes a routing prompt or model
- they need to know if the classifier still returns the right label and valid JSON
- they want one repeatable release check instead of manual spot-checking

Files:
- [dataset.jsonl](./dataset.jsonl)
- [config.evalgate.json](./config.evalgate.json)
- [demo-pass.evalgate.json](./demo-pass.evalgate.json)
- [demo-fail.evalgate.json](./demo-fail.evalgate.json)

## Input Files

Dataset excerpt:

```jsonl
{"id":"case_001","input":{"ticket_text":"Customer says they were double charged"},"expected":{"category":"billing"}}
{"id":"case_002","input":{"ticket_text":"Refund me now for the duplicate payment"},"expected":{"category":"refund"}}
{"id":"case_003","input":{"ticket_text":"Please cancel my subscription immediately"},"expected":{"category":"cancellation"}}
{"id":"case_004","input":{"ticket_text":"The mobile app crashes every time I upload a photo"},"expected":{"category":"technical"}}
```

Config excerpt:

```json
{
  "name": "Support Ticket Classifier",
  "promptText": "Classify the support ticket into exactly one category: billing, refund, cancellation, technical, or unknown. Return valid JSON only.",
  "modelProvider": "mock",
  "modelName": "mock-classifier",
  "thresholds": {
    "schema_valid_rate_min": 0.95,
    "enum_accuracy_min": 0.9,
    "field_level_accuracy_min": 0.9,
    "latency_p95_max_ms": 2500
  }
}
```

## Command

```bash
pnpm evalgate:sample
```

## Terminal Output

Example output:

```text
Eval complete.
Pass: yes
Schema valid rate: 1
Enum accuracy: 1
Field accuracy: 1
Latency p95 (ms): 41
Report: /.../.artifacts/report.json
Summary: /.../.artifacts/summary.md
JUnit: /.../.artifacts/junit.xml
```

## Generated Artifacts

`report.json` excerpt:

```json
{
  "pass": true,
  "provider": "mock",
  "model": "mock-classifier",
  "dataset_path": "examples/ticket-triage/dataset.jsonl",
  "metrics": {
    "schema_valid_rate": 1,
    "enum_accuracy": 1,
    "field_level_accuracy": 1,
    "latency_p95_ms": 41
  },
  "failure_counts_by_type": {
    "schema_invalid": 0,
    "wrong_enum": 0,
    "field_mismatch": 0,
    "missing_field": 0,
    "timeout": 0,
    "provider_error": 0,
    "parse_error": 0
  }
}
```

`summary.md` excerpt:

```md
# EvalGate Summary

- Gate: **PASS**
- Regression: **not checked**
- Provider / Model: `mock` / `mock-classifier`

## Metrics

| Metric | Value |
| --- | --- |
| schema_valid_rate | 1.0000 |
| enum_accuracy | 1.0000 |
| field_level_accuracy | 1.0000 |
| latency_p95_ms | 41 ms |
```

`junit.xml` excerpt:

```xml
<testsuite name="EvalGate" tests="5" failures="0">
  <testcase classname="EvalGate.mock" name="case_001" time="0.025"></testcase>
  <testcase classname="EvalGate.mock" name="case_002" time="0.029"></testcase>
  <testcase classname="EvalGate.mock" name="case_003" time="0.041"></testcase>
  <testcase classname="EvalGate.mock" name="case_004" time="0.021"></testcase>
  <testcase classname="EvalGate" name="gate" time="0.135"></testcase>
</testsuite>
```

## Pass / Fail Demo

If you want a shorter public demo:

```bash
pnpm demo:pass
pnpm demo:fail
```
