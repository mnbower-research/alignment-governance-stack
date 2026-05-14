# Eval Suite

Cross-stack deterministic evaluation suite for Alignment Governance Stack.

This package runs built-in governance scenarios through governance-core and receipt verification.

It also exposes the v1.1.0 Dogfood Workbench eval pack:

- `builtInDogfoodEvalCases`
- `builtInEnterpriseDogfoodEvalCases`
- `runDogfoodEvalSuite`
- `runEnterpriseDogfoodEvalSuite`

Dogfood cases model realistic AGS development workflows and an Enterprise Financial Report Golden Path, but they do not execute real actions.

This package does not add a dashboard, persistent history, database, provider integration, or network calls.
