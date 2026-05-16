# Developer CLI

The AGS CLI provides a dependency-light local entry point for evals, governance checks, audit reports, and receipt verification.

It answers the v0.8.0 developer question:

```text
Can a developer run AGS locally and see the governance chain work?
```

## Local Usage

Build the package:

```bash
corepack pnpm --filter @alignment-governance-stack/cli build
```

Run commands through the package script:

```bash
corepack pnpm --filter @alignment-governance-stack/cli ags help
corepack pnpm --filter @alignment-governance-stack/cli ags eval
corepack pnpm --filter @alignment-governance-stack/cli ags dogfood
corepack pnpm --filter @alignment-governance-stack/cli ags redteam
corepack pnpm --filter @alignment-governance-stack/cli ags gaps examples/alignment-gaps/conflicting-financial-governance.json
corepack pnpm --filter @alignment-governance-stack/cli ags audit-report examples/audit-report/potential-theater-signals.json
corepack pnpm --filter @alignment-governance-stack/cli ags audit-report examples/audit-report/potential-theater-signals.json --json
corepack pnpm --filter @alignment-governance-stack/cli ags agency-chain examples/agency-chain/strong-agent-workflow-chain.json
corepack pnpm --filter @alignment-governance-stack/cli ags govern examples/cli/safe-internal-report.json
corepack pnpm --filter @alignment-governance-stack/cli ags govern examples/cli/safe-internal-report.json --json
corepack pnpm --filter @alignment-governance-stack/cli ags memory examples/demo/full-stack/receipt-history.json
```

After build, the compiled binary can also be run directly:

```bash
node packages/cli/dist/cli.js help
node packages/cli/dist/cli.js eval
node packages/cli/dist/cli.js dogfood
node packages/cli/dist/cli.js redteam
node packages/cli/dist/cli.js gaps examples/alignment-gaps/conflicting-financial-governance.json
node packages/cli/dist/cli.js gaps examples/alignment-gaps/conflicting-financial-governance.json --json
node packages/cli/dist/cli.js audit-report examples/audit-report/potential-theater-signals.json
node packages/cli/dist/cli.js audit-report examples/audit-report/agent-workflow-gap-review.json --out .tmp/governance-reality-report.md
node packages/cli/dist/cli.js audit-report examples/audit-report/ags-self-audit.json --out .tmp/ags-self-audit.md
node packages/cli/dist/cli.js agency-chain examples/agency-chain/strong-agent-workflow-chain.json
node packages/cli/dist/cli.js agency-chain examples/agency-chain/weak-agent-workflow-chain.json --json
node packages/cli/dist/cli.js govern examples/cli/safe-internal-report.json
node packages/cli/dist/cli.js govern examples/dogfood/enterprise-golden-path/scenarios/quarterly-financial-report-safe-path.json
node packages/cli/dist/cli.js govern examples/cli/safe-internal-report.json --json
node packages/cli/dist/cli.js memory examples/demo/full-stack/receipt-history.json
node packages/cli/dist/cli.js memory examples/dogfood/enterprise-golden-path/receipts/sample-enterprise-receipt-history.json
```

## Commands

- `ags help`
- `ags version`
- `ags eval`
- `ags dogfood`
- `ags redteam`
- `ags gaps <input.json>`
- `ags gaps <input.json> --json`
- `ags audit-report <input.json>`
- `ags audit-report <input.json> --json`
- `ags audit-report <input.json> --out report.md`
- `ags agency-chain <input.json>`
- `ags agency-chain <input.json> --json`
- `ags closure <input.json>`
- `ags closure <input.json> --json`
- `ags closure <input.json> --out closure.md`
- `ags govern <input.json>`
- `ags govern <input.json> --json`
- `ags receipt verify <receipt.json>`
- `ags receipt hash <receipt.json>`
- `ags memory <receipts.json>`

### `ags help`

Prints available commands.

### `ags version`

Prints the CLI package version.

### `ags eval`

Runs the built-in deterministic eval suite from `@alignment-governance-stack/eval-suite`.

Output includes:

- total
- passed
- failed
- failed case IDs and failure reasons, when failures exist

### `ags dogfood`

Runs the built-in Dogfood Workbench eval suite from `@alignment-governance-stack/eval-suite`.

Output includes:

- Internal Dogfood passed/total
- Enterprise Golden Path passed/total
- Content Publishing Dogfood passed/total
- Content Publishing Hardening passed/total
- combined passed/total
- failed dogfood case IDs and reasons, when failures exist

The hardening line covers AGS public-claim cases for unsupported claims, direct external publish without review, internal-draft laundering, runtime substitution, approval reuse across targets, and tone/claim drift.

### `ags redteam`

Runs the built-in Adversarial Red-Team Eval Pack from `@alignment-governance-stack/eval-suite`.

Output includes:

- total
- passed
- failed
- failed red-team case IDs and reasons, when failures exist

### `ags gaps <input.json>`

Runs the Alignment Gap Detector from `@alignment-governance-stack/company-profile-generator`.

Input shape:

```json
{
  "companyAlignmentInput": {},
  "companyAlignmentProfile": {},
  "policyProfile": {},
  "authorityMap": {},
  "participationPolicy": {}
}
```

All fields are optional, but at least one governance input is useful. Use `--json` for the full `AlignmentGapReport`.

Output includes:

- gap count
- highest severity
- human review note
- no-mutation note

### `ags govern <input.json>`

Runs `evaluateGovernedRuntimeActionWithReceipt` from `@alignment-governance-stack/governance-core`.

Input shape:

```json
{
  "proposal": {},
  "runtimeAction": {},
  "policyProfile": {},
  "authorityMap": {},
  "approvalEvidence": {},
  "humanParticipation": {},
  "permitOptions": {},
  "validationOptions": {},
  "receiptOptions": {}
}
```

Only `proposal` is required. The other fields are optional and are passed through to governance-core.

Readable output includes:

- finalDecision
- PGDL decision
- policy result, when supplied
- authority validation, when supplied
- participation quality, when supplied
- AAG decision, when run
- Runtime Binding decision, when run
- receipt hash

Use `--json` for the full governance and receipt result:

```bash
corepack pnpm --filter @alignment-governance-stack/cli ags govern examples/cli/safe-internal-report.json --json
```

### `ags audit-report <input.json>`

Reads a local JSON file and generates a Governance Reality Report.

Input may be either:

- a full `GovernanceRealityReport`
- a simplified audit input with `subject` and `findings`

Readable output is Markdown by default. Use `--json` for the normalized typed report. Use `--out report.md` to write Markdown to a file.

The command does not call networks, execute actions, store data, or use model calls.

Rendered reports include audit mode, methodology, limitations, overall assessment, finding summary, severity and confidence definitions, findings, remediation summary, evidence appendix, optional self-audit disclosure, and a non-accusatory closing note.

Self-audit example:

```bash
node packages/cli/dist/cli.js audit-report examples/audit-report/ags-self-audit.json --out .tmp/ags-self-audit.md
```

Exit behavior:

- `0`: report generated with no high or critical findings
- `1`: report generated and high or critical findings are present
- `2`: invalid input or validation failure

### `ags agency-chain <input.json>`

Reads a local agency-chain JSON file and evaluates where agency is preserved, weak, broken, or insufficiently evidenced.

Readable output includes:

- chain ID
- overall status
- audit mode
- link count
- issue count
- link statuses
- issue audit questions and remediations

Use `--json` for the full evaluated `AgencyChainMap`.

Exit behavior:

- `0`: preserved or partially preserved with no high/critical issues
- `1`: weak or broken chain, or high/critical issues
- `2`: invalid input

Example:

```bash
node packages/cli/dist/cli.js agency-chain examples/agency-chain/weak-agent-workflow-chain.json --json
```

### `ags closure <input.json>`

Reads a local Decision Closure Artifact input, generates a canonical closure artifact, validates it, and prints a third-party-readable summary by default.

Output modes:

- Markdown report with `--out`
- JSON artifact plus validation with `--json`
- text summary by default

Exit codes:

- `0`: no high or critical closure findings
- `1`: high or critical closure findings exist
- `2`: invalid closure input

Examples:

```bash
node packages/cli/dist/cli.js closure examples/decision-closure/allowed-reviewed-publish.json
node packages/cli/dist/cli.js closure examples/decision-closure/missing-runtime-permit.json --json
node packages/cli/dist/cli.js closure examples/decision-closure/allowed-reviewed-publish.json --out .tmp/allowed-reviewed-publish-closure.md
```

### `ags receipt verify <receipt.json>`

Reads a governance receipt JSON file and verifies it with `verifyGovernanceReceipt`.

Output includes:

- valid
- expectedHash
- actualHash
- reason

### `ags receipt hash <receipt.json>`

Reads a governance receipt JSON file and prints `hashGovernanceReceipt`.

### `ags memory <receipts.json>`

Reads a JSON array of governance receipts and runs Governance Memory analysis.

Output includes:

- receipt count
- pattern count
- recommendation count
- top high-severity recommendations, when present
- a note that all recommendations require human review

## Example Inputs

Example inputs live under `examples/cli`:

- `safe-internal-report.json`
- `runtime-substitution-denied.json`
- `hard-boundary-block.json`
- `rubber-stamp-denied.json`

Integration examples that can also be checked with `ags govern` live under `examples/integrations/n8n/inputs`.

Full-stack demo inputs live under `examples/demo/full-stack`.

Dogfood workbench scenarios live under `examples/dogfood/scenarios`, `examples/dogfood/enterprise-golden-path/scenarios`, and `examples/dogfood/content-publishing/scenarios`. The public-claim policy fixture lives at `examples/dogfood/content-publishing/public-claim-policy.json`. Red-team scenarios live under `examples/redteam/scenarios`.

Alignment Gap Detector examples live under `examples/alignment-gaps`.

Governance Reality Report examples live under `examples/audit-report`.

Agency Chain Mapper examples live under `examples/agency-chain`.

Decision Closure Artifact examples live under `examples/decision-closure`.

## Exit Codes

- `0`: command succeeded, evals passed, receipt is valid, or governance result is `execution_allowed` / `allowed_by_aag`
- `1`: malformed input for most commands, missing file, unknown command, runtime error, or generated audit report with high or critical findings
- `2`: governed denial, block, escalation, approval required, invalid receipt, or high/critical alignment gaps

For `ags audit-report`, invalid input returns `2` so report generation can be used in deterministic audit workflows.

## Boundaries

The CLI does not:

- execute actions
- run network calls
- send telemetry
- store approvals or receipts
- use a database
- run auth
- start a web server
- call LLMs or provider APIs
- provide interactive prompts or config files
