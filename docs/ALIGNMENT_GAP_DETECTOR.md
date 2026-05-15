# Alignment Gap Detector

The Alignment Gap Detector / Policy Conflict Analyzer is a deterministic diagnostic layer for company governance inputs.

It answers:

```text
Is the organization governable before AGS turns its policy into agent governance?
```

Agents amplify the alignment state of whoever deploys them. If a company says high-sensitivity financial reports must not leave the organization, but also marks `email.send` as externally allowed for high-sensitivity data, that conflict should be surfaced before runtime.

## What It Detects

The detector looks for alignment gaps such as:

- missing stop authority for production or high-risk actions
- external sharing conflicts for medium or high-sensitivity data
- hard-boundary override claims
- approval requirements with no matching approver
- human review requirements without meaningful participation policy
- production irreversible tools without scoped authority
- ambiguous `neverAutomate` boundaries that cannot compile into deterministic hard boundaries
- policy rules that allow what company boundaries forbid
- broad high-authority scopes
- unowned high-risk tools or high-sensitivity data

## What It Does Not Do

The detector does not:

- mutate Policy Profiles
- mutate Authority Maps
- mutate Human Participation policies
- execute actions
- call networks
- use LLMs
- auto-fix governance
- provide legal or compliance guarantees

It produces an `AlignmentGapReport` for human review.

## CLI

Build the CLI:

```bash
corepack pnpm --filter @alignment-governance-stack/cli build
```

Run a coherent example:

```bash
node packages/cli/dist/cli.js gaps examples/alignment-gaps/coherent-company-profile.json
```

Run a conflicting example:

```bash
node packages/cli/dist/cli.js gaps examples/alignment-gaps/conflicting-financial-governance.json
node packages/cli/dist/cli.js gaps examples/alignment-gaps/conflicting-financial-governance.json --json
```

Exit code `0` means no high or critical gaps were detected. Exit code `2` means at least one high or critical gap requires human review.

## API

```ts
import {
  detectAlignmentGaps,
  summarizeAlignmentGapReport
} from "@alignment-governance-stack/company-profile-generator";
```

`detectAlignmentGaps` accepts company alignment input/profile, optional policy profile, optional authority map, and optional participation policy. It always returns a report unless the function input itself is malformed.

## Future Work

- Dashboard view for onboarding and governance review
- Company profile wizard integration
- Conflict resolution workflow
- Human-approved policy PR suggestions
- Additional deterministic checks as real deployment patterns emerge
