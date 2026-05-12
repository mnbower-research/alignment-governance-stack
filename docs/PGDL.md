# PGDL

PGDL means Pre-Gate Deliberation Layer.

PGDL asks: "What kind of action should be proposed in the first place?"

PGDL analyzes, objects, rewrites, resolves, escalates, rejects, or forwards a proposal. It must not execute actions or approve execution.

PGDL is a proposal maturation, objection, and discernment layer. It is not an execution gate.

## PGDL v0.1

PGDL v0.1 generates deterministic packets with rule-based logic. It does not call LLMs and does not execute or approve actions.

The v0.1 flow analyzes a proposal, raises objections, detects compliance theater, writes an internalized principle when useful, creates a safer resolved proposal when a simple rewrite is known, and resolves the packet decision.

Objection categories include authority, scope, reversibility, human judgment, external impact, data sensitivity, and compliance theater.

Resolved proposals are intentionally conservative. Destructive deletes can become non-destructive review packets. External send or publish actions can become drafts for review. Unknown high-risk actions escalate rather than inventing complex behavior.

Supported decisions are `forward_to_aag`, `revise_before_aag`, `escalate_to_human`, and `reject_before_aag`.
