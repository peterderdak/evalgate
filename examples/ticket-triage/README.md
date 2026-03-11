# Ticket Triage Example

This is the sample ezEval use case included in the repo.

It models a support-ticket classifier that must return exactly one structured label:

- `billing`
- `refund`
- `cancellation`
- `technical`
- `unknown`

Files:

- [dataset.jsonl](./examples/ticket-triage/dataset.jsonl): sample evaluation dataset
- [config.ezeval.json](./examples/ticket-triage/config.ezeval.json): default config
- [demo-pass.ezeval.json](./examples/ticket-triage/demo-pass.ezeval.json): passing demo gate
- [demo-fail.ezeval.json](./examples/ticket-triage/demo-fail.ezeval.json): intentionally failing demo gate

Run the standard sample:

```bash
pnpm ezeval:sample
```

Run the passing demo:

```bash
pnpm demo:pass
```

Run the failing demo:

```bash
pnpm demo:fail
```
