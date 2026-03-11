# Ticket Triage Example

This is the sample EvalGate use case included in the repo.

It models a support-ticket classifier that must return exactly one structured label:

- `billing`
- `refund`
- `cancellation`
- `technical`
- `unknown`

Files:

- [dataset.jsonl](/Users/peterderdak/Documents/Playground/examples/ticket-triage/dataset.jsonl): sample evaluation dataset
- [config.evalgate.json](/Users/peterderdak/Documents/Playground/examples/ticket-triage/config.evalgate.json): default config
- [demo-pass.evalgate.json](/Users/peterderdak/Documents/Playground/examples/ticket-triage/demo-pass.evalgate.json): passing demo gate
- [demo-fail.evalgate.json](/Users/peterderdak/Documents/Playground/examples/ticket-triage/demo-fail.evalgate.json): intentionally failing demo gate

Run the standard sample:

```bash
pnpm eval:sample
```

Run the passing demo:

```bash
pnpm demo:pass
```

Run the failing demo:

```bash
pnpm demo:fail
```
