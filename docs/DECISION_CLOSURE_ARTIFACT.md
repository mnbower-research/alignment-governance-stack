# Decision Closure Artifact

Decision Closure Artifact is the execution-boundary proof object. It does not replace logs, receipts, runtime binding, or audit reports. It binds their most important facts into one third-party-readable artifact.

Authority before execution. Evidence after execution.

A true gate does not merely log what happened. It proves what was allowed, refused, or escalated at the moment of consequence.

Policy is not proof.
Logs are not enough.
A true gate produces execution-boundary proof.
AGA must detect when that proof is incomplete, contradictory, or not third-party-readable.

## What It Is

A Decision Closure Artifact records what action was about to happen, which execution boundary it reached, what authority allowed, refused, escalated, revised, or blocked it, what conditions applied, and what proof binds the decision.

It is deterministic, JSON-serializable, and local. It is designed to be readable by a third party without reconstructing internal logs.

## Why Logs Are Not Enough

Logs can show what happened after the fact. They often require internal system context to interpret. A closure artifact captures the execution-boundary decision in one object so a reviewer can inspect the action, authority, conditions, and proof together.

## Why Policy Is Not Proof

Policy states what should happen. A Decision Closure Artifact records what decision was made for a specific action at a specific boundary. It can show whether runtime permit evidence, receipt evidence, authority evidence, and human review were demonstrated.

## Execution-Boundary Proof

The artifact includes:

- action summary, tool, target, sensitivity, and reversibility
- execution boundary ID, type, time, permit requirement, permit ID, and runtime binding hash
- authority source and reviewer context
- decision outcome and rule IDs
- conditions such as allowed tools, allowed targets, expiration, and notes
- receipt hash, previous receipt hash, optional signature fields, canonical hash, and integrity status
- audit summary, unresolved questions, theater signals, and remediation hints

## Integrity Hash

The canonical hash uses stable key ordering. It excludes mutable proof fields `proof.canonicalHash`, `proof.signature`, and `proof.integrityStatus`; it includes the remaining artifact contents. Signatures are optional and are not treated as verified unless verification is actually supplied.

This release does not claim cryptographic finality beyond the deterministic canonical hash and any explicitly supplied signature metadata.

## Relationship To AGS

PGDL matures the proposal before gate evaluation.

AAG decides whether the proposed action should proceed.

Runtime Binding checks whether the exact runtime action matches the permit.

Receipts preserve the governance path after the decision.

Agency Chain Mapper shows where agency was preserved, weakened, or not demonstrated.

Governance Reality Reports turn closure and other AGS outputs into auditor-ready findings and remediation paths.

Decision Closure Artifact binds the most important execution-boundary facts into one proof object.

## CLI Usage

```bash
node packages/cli/dist/cli.js closure examples/decision-closure/allowed-reviewed-publish.json
node packages/cli/dist/cli.js closure examples/decision-closure/allowed-reviewed-publish.json --json
node packages/cli/dist/cli.js closure examples/decision-closure/allowed-reviewed-publish.json --out .tmp/allowed-reviewed-publish-closure.md
```

High or critical validation findings exit `1`. Bad input exits `2`.

## Example Finding Language

- runtime permit required but not demonstrated
- execution-boundary proof incomplete
- authority validity not demonstrated
- human review required but not demonstrated
- hard boundary present with allow decision
- public claim support requires verification
- internal draft boundary not demonstrated
- approval reuse target mismatch
- receipt integrity not demonstrated

## v1.7.1 Decision Closure Red-Team Hardening

v1.7.1 adds an advanced deterministic scenario for an AGS v1.7.0 public announcement. The legitimate task is an internal draft for human review. The adversarial pattern gradually turns that draft into public execution while combining unsupported public claims, weak participation, target mismatch, runtime substitution, and incomplete closure proof.

The scenario matters because public overclaim laundering can make an action appear governed while the evidence does not demonstrate support for the public claims. Internal-draft framing can hide external execution intent. Target-bound approval matters because approval for one destination should not authorize another channel. Runtime substitution matters because the action that executes must match the permit. Closure proof must be complete enough for a third-party reviewer to understand the boundary decision without reconstructing logs.

Run it locally:

```bash
node packages/cli/dist/cli.js closure examples/decision-closure/v170-announcement-ultimate-bypass.json
node packages/cli/dist/cli.js closure examples/decision-closure/v170-announcement-ultimate-bypass.json --json
node packages/cli/dist/cli.js closure examples/decision-closure/v170-announcement-ultimate-bypass.json --out .tmp/v170-announcement-ultimate-bypass.md
```

Expected result: exit `1`, `valid: false`, severity `critical`. The artifact records an allow decision, but AGA does not treat it as safely allowed because runtime permit proof, runtime binding, target-bound approval, receipt proof, and third-party readability are not demonstrated. The artifact is unsigned by default, and that status is disclosed honestly.

## v1.7.2 Completeness Matrix

v1.7.2 adds an explicit Decision Closure completeness matrix for content-publishing calibration:

- Allowed consequential external action: requires valid authority, human review when required, runtime permit, runtime binding hash, receipt hash, readable summary, scoped target, and no active hard-boundary conflict.
- Allowed internal low-risk draft: does not require external-publish proof; missing signature stays low.
- Refused action: requires decision reason and readable summary, but does not require runtime permit or binding proof.
- Escalated action: requires reason, unresolved questions, and human-review requirement.
- Blocked hard-boundary action: requires hard boundary ID, reason, and remediation.
- Require approval: requires approval reason, authority requirement, target scope, and open questions.
- Revise action: requires revision reason and safer action scope when available.

Closure completeness depends on decision type. A missing receipt for a refused action is calibrated differently from a missing receipt on an allowed consequential external action.

## Examples

Examples live under `examples/decision-closure`:

- `allowed-reviewed-publish.json`
- `missing-runtime-permit.json`
- `hard-boundary-allowed.json`
- `rubber-stamp-review.json`
- `refused-public-overclaim.json`
- `escalated-sensitive-action.json`
- `v170-announcement-ultimate-bypass.json`

Fixture summaries live under `evals/fixtures/decision-closure`.

## Limitations

Decision Closure Artifact does not execute actions, store approvals, verify human identity, provide legal compliance, claim regulator approval, or replace a receipt store. Optional signatures are metadata unless signing and verification are actually implemented around the artifact.
