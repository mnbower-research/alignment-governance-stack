# Eval Suite

Cross-stack deterministic evaluation suite for Alignment Governance Stack.

This package runs built-in governance scenarios through governance-core and receipt verification.

It also exposes the v1.1.0 Dogfood Workbench eval pack:

- `builtInDogfoodEvalCases`
- `builtInEnterpriseDogfoodEvalCases`
- `builtInContentPublishingDogfoodEvalCases`
- `builtInContentPublishingHardeningEvalCases`
- `runDogfoodEvalSuite`
- `runEnterpriseDogfoodEvalSuite`
- `runContentPublishingDogfoodEvalSuite`
- `runContentPublishingHardeningEvalSuite`
- `builtInRedTeamEvalCases`
- `runRedTeamEvalSuite`

Dogfood cases model realistic AGS development workflows, an Enterprise Financial Report Golden Path, a Content Publishing Dogfood Agent, and a focused Content Publishing Governance Hardening pack for AGS public-claim agents. Red-team cases model adversarial bypass attempts. None of these evals execute real actions.

This package does not add a dashboard, persistent history, database, provider integration, or network calls.
