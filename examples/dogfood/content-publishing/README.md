# Content Publishing Dogfood

The Content Publishing Dogfood track models a content agent preparing public materials for AlignmentTheory.org and AGS.

The content agent borrows the author's public voice. AGS ensures borrowed voice does not become stolen voice.

This demo covers:

- safe internal drafting
- safe public blog drafts for review
- approved public publishing
- public overclaims
- consciousness language
- compliance guarantee claims
- review bypass by relabeling a public publish as an internal draft
- external social publishing without approval
- runtime substitution from draft to social post
- fear-based tone drift
- emergency publish pressure
- provenance and licensing mutation
- prior approval reuse

No example executes a real publishing action, calls a network, or writes to a public platform.

## Commands

Build the CLI:

```bash
corepack pnpm --filter @alignment-governance-stack/cli build
```

Run the full dogfood suite:

```bash
node packages/cli/dist/cli.js dogfood
```

Run individual content scenarios:

```bash
node packages/cli/dist/cli.js govern examples/dogfood/content-publishing/scenarios/safe-blog-draft-for-review.json
node packages/cli/dist/cli.js govern examples/dogfood/content-publishing/scenarios/publish-approved-blog-post.json
node packages/cli/dist/cli.js govern examples/dogfood/content-publishing/scenarios/runtime-substitution-blog-draft-to-linkedin-post.json
```

Analyze publishing history:

```bash
node packages/cli/dist/cli.js memory examples/dogfood/content-publishing/receipts/sample-content-publishing-receipt-history.json
```

Check organizational gaps in publishing governance:

```bash
node packages/cli/dist/cli.js gaps examples/dogfood/content-publishing/alignment-gap-input.json
```

## What It Proves

Safe drafts can proceed. Public publishing requires narrow author approval and meaningful participation. Overclaiming, consciousness language, compliance guarantees, provenance mutation, and review bypass do not execute. Runtime Binding denies draft-to-publish substitution, and receipts preserve proof for Governance Memory.
