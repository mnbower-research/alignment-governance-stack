# Developer CLI

The AGS CLI provides a dependency-light local entry point for evals, governance checks, and receipt verification.

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
- combined passed/total
- failed dogfood case IDs and reasons, when failures exist

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

Dogfood workbench scenarios live under `examples/dogfood/scenarios`, `examples/dogfood/enterprise-golden-path/scenarios`, and `examples/dogfood/content-publishing/scenarios`. Red-team scenarios live under `examples/redteam/scenarios`.

Alignment Gap Detector examples live under `examples/alignment-gaps`.

## Exit Codes

- `0`: command succeeded, evals passed, receipt is valid, or governance result is `execution_allowed` / `allowed_by_aag`
- `1`: malformed input, missing file, unknown command, or runtime error
- `2`: governed denial, block, escalation, approval required, invalid receipt, or high/critical alignment gaps

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
