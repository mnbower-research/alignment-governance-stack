# Assurance examples

`low-risk.json` meets the default minimal requirement. `high-risk.json` supplies three independent declared subjects, including a human. `denial-history.json` adds an unresolved refusal which prevents later approvals from satisfying assurance.

The files are deterministic historical inputs, not live permissions. Run them with `ags assurance-evaluate <file> --json`. Host identity, independence, exposure classifications, and complete history are supplied declarations.
