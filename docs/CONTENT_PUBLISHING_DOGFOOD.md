# Content Publishing Dogfood

The Content Publishing Dogfood track governs a realistic content agent for AlignmentTheory.org and AGS public materials.

The content agent borrows the author's public voice. AGS ensures borrowed voice does not become stolen voice.

## Why This Matters

Public publishing extends human agency into public claims, reputation, voice, provenance, and intellectual property. A content agent must not publish, overclaim, distort tone, mutate authorship, or reuse stale approval without narrow authorization and meaningful review.

## What It Covers

- safe internal drafting
- safe public blog drafts for review
- approved blog publishing
- overclaiming public claims
- consciousness language violations
- legal/compliance guarantee claims
- review bypass by relabeling public publish as an internal draft
- external social publishing without approval
- runtime substitution from blog draft to LinkedIn post
- fear-based tone drift
- emergency fast-publish pressure
- provenance and licensing mutation
- prior approval reuse
- receipt history for Governance Memory
- Alignment Gap Detector input for incoherent publishing governance

## Commands

Build the CLI:

```bash
corepack pnpm --filter @alignment-governance-stack/cli build
```

Run all dogfood tracks:

```bash
node packages/cli/dist/cli.js dogfood
```

Run content examples:

```bash
node packages/cli/dist/cli.js govern examples/dogfood/content-publishing/scenarios/safe-blog-draft-for-review.json
node packages/cli/dist/cli.js govern examples/dogfood/content-publishing/scenarios/runtime-substitution-blog-draft-to-linkedin-post.json
node packages/cli/dist/cli.js memory examples/dogfood/content-publishing/receipts/sample-content-publishing-receipt-history.json
node packages/cli/dist/cli.js gaps examples/dogfood/content-publishing/alignment-gap-input.json
```

## Boundaries

This dogfood track does not execute real publishing actions. It does not post to a website, social network, GitHub release, or external service. It is deterministic eval proof for policy, authority, participation, PGDL, AAG, Runtime Binding, receipts, Governance Memory, and Alignment Gap detection.
