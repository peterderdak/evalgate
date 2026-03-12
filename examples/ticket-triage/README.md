# Ticket Triage Example

This is the sample EvalGate use case included in the repo.

It models a support-ticket classifier that must return exactly one label:

- `billing`
- `refund`
- `cancellation`
- `technical`
- `unknown`

Files:

- [dataset.jsonl](./examples/ticket-triage/dataset.jsonl): sample evaluation dataset
- [config.evalgate.json](./examples/ticket-triage/config.evalgate.json): default run config
- [demo-pass.evalgate.json](./examples/ticket-triage/demo-pass.evalgate.json): passing demo gate
- [demo-fail.evalgate.json](./examples/ticket-triage/demo-fail.evalgate.json): intentionally failing gate

Run the standard sample:

```bash
pnpm evalgate:sample
```

Run the passing demo:

```bash
pnpm demo:pass
```

Run the failing demo:

```bash
pnpm demo:fail
```
