# Dogfood Workbench

The Dogfood Workbench is a hardening pack for AGS itself and for realistic buyer-facing workflows.

It answers the wide-but-shallow critique by running realistic AGS development workflows through AGS governance and the Eval Suite.

```text
Dogfooding = realistic AGS development scenarios
Eval Suite = repeatable proof
Receipts = audit memory
Governance Memory = pattern learning from receipt history
```

## Tracks

### Internal AGS Development Dogfood

This track proves AGS governs its own development workflows. It covers:

- safe README documentation update
- safe release-notes draft
- dangerous package directory deletion
- npm publish requiring release authority
- direct push to main stopped before execution
- external email revised to draft-first flow
- authority-map modification stopped before execution
- hard boundary for deleting receipt history
- rubber-stamped release approval denial
- runtime substitution from draft to npm publish

### Enterprise Financial Report Golden Path

This track proves AGS can govern a sensitive business workflow: generating and distributing a Q2 financial report.

It exercises:

- high-sensitivity financial data
- direct-send attempts without review
- external-domain hard boundaries
- financial source data mutation blocks
- Finance Director / finance_admin authority
- meaningful human participation versus rubber-stamping
- safe internal report draft generation
- runtime substitution denial
- receipt history for Governance Memory

### Content Publishing Dogfood

This track proves AGS can govern a content agent that drafts and publishes public AGS / AlignmentTheory.org materials.

The content agent borrows the author's public voice. AGS ensures borrowed voice does not become stolen voice.

It exercises:

- safe internal and public draft creation
- approved public blog publishing
- overclaiming public claims
- consciousness language and legal/compliance guarantee blocks
- review bypass attempts
- external social publishing without approval
- fear-based tone drift and emergency publish pressure
- provenance and license mutation
- prior approval reuse
- runtime substitution from draft to social post
- receipt history for Governance Memory
- Alignment Gap Detector input for publishing governance conflicts

### Content Publishing Hardening

v1.6.1 adds a focused hardening suite for agents that write public claims about AGS itself. It covers safe AGS v1.6.0 draft creation, unsupported public claims, external publish without review, internal-draft laundering, runtime substitution, approval reuse across external targets, tone/claim drift, and reviewed narrow-target publication.

The suite is reported separately in `ags dogfood` as `Content Publishing Hardening`.

### Content Publishing Depth Hardening

v1.7.2 adds 30 deterministic content-publishing variants. The suite focuses on severity calibration, false-positive and false-negative handling, report readability, remediation wording, and Decision Closure completeness. It covers safe internal drafts, scoped public release notes, public overclaim variants, boundary laundering, weak review, target-bound approval mismatch, runtime substitution, proof gaps, and drift.

The suite is reported separately in `ags dogfood` as `Content Publishing Depth Hardening`.

### Decision Closure Hardening

v1.7.1 adds a focused Decision Closure hardening suite for an AGS v1.7.0 public announcement. The case combines public overclaim laundering, internal-draft framing that does not match external execution, weak human participation, approval reuse across targets, runtime substitution, incomplete receipt proof, and an allow decision with hard boundaries present.

The suite is reported separately in `ags dogfood` as `Decision Closure Hardening`.

## Commands

Build the CLI:

```bash
corepack pnpm --filter @alignment-governance-stack/cli build
```

Run dogfood evals:

```bash
node packages/cli/dist/cli.js dogfood
```

Run individual scenarios:

```bash
node packages/cli/dist/cli.js govern examples/dogfood/scenarios/safe-readme-update.json
node packages/cli/dist/cli.js govern examples/dogfood/scenarios/runtime-substitution-attempt.json
node packages/cli/dist/cli.js govern examples/dogfood/enterprise-golden-path/scenarios/quarterly-financial-report-safe-path.json
node packages/cli/dist/cli.js govern examples/dogfood/enterprise-golden-path/scenarios/quarterly-financial-report-runtime-substitution.json
node packages/cli/dist/cli.js govern examples/dogfood/content-publishing/scenarios/safe-blog-draft-for-review.json
node packages/cli/dist/cli.js govern examples/dogfood/content-publishing/scenarios/runtime-substitution-blog-draft-to-linkedin-post.json
node packages/cli/dist/cli.js memory examples/dogfood/receipts/sample-dogfood-receipt-history.json
node packages/cli/dist/cli.js memory examples/dogfood/enterprise-golden-path/receipts/sample-enterprise-receipt-history.json
node packages/cli/dist/cli.js memory examples/dogfood/content-publishing/receipts/sample-content-publishing-receipt-history.json
node packages/cli/dist/cli.js gaps examples/dogfood/content-publishing/alignment-gap-input.json
node packages/cli/dist/cli.js closure examples/decision-closure/v170-announcement-ultimate-bypass.json
```

## Boundaries

The Dogfood Workbench does not execute real actions. It does not publish packages, push to GitHub, send emails, delete files, mutate authority maps, delete receipts, publish blog posts, post to social platforms, or deploy a site.

It creates repeatable eval proof and receipt-oriented memory inputs for human review.
