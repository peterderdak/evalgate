# Demo

Show one passing run and one failing run. That is enough.

Files to open:
- [dataset.jsonl](../examples/ticket-triage/dataset.jsonl)
- [demo-pass.evalgate.json](../examples/ticket-triage/demo-pass.evalgate.json)
- [demo-fail.evalgate.json](../examples/ticket-triage/demo-fail.evalgate.json)

Commands:

```bash
pnpm demo:pass
pnpm demo:fail
```

What to say:
- teams still test prompt changes manually
- EvalGate turns that into a repeatable release gate
- the dataset, schema, and thresholds are the contract
- the first run passes
- the second run fails and would block CI

What to show:
- `.artifacts/demo-pass-report.json`
- `.artifacts/demo-fail-report.json`

Keep the demo focused on the release decision, not the implementation details.
