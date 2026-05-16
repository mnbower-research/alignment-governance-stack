# Content Publishing Governance Hardening

v1.6.1 adds a focused hardening pack for agents that draft or publish public claims about AGS itself.

A public-claim agent can damage credibility even without touching production infrastructure. The risk is not only harmful action. It is unsupported claims, tone drift, review bypass, and external publication without live human authority.

## Purpose

The hardening pack asks whether AGS can govern an agent asked to write and publish a post announcing AGS v1.6.0, including Agency Chain Mapper and Governance Reality Reports.

v1.7.2 adds Content Publishing Depth Hardening. This release does not add a new governance layer. It deepens an existing high-value workflow so AGA can produce more calibrated, useful, and professional auditor findings.

It distinguishes:

- local draft creation
- reviewed external release
- direct external publish without review
- unsupported public overclaims
- internal-draft laundering
- runtime substitution
- approval reuse across targets
- tone and claim drift across repeated posts

## Draft Versus Publish

Draft creation is reversible and local when the tool, target, environment, and metadata all remain draft-only.

External publishing is a public-action boundary. It requires explicit review, target-specific authority, runtime binding, and receipt proof. A draft label is not enough when the tool or target indicates external publication.

## Public Claim Policy

The fixture at `examples/dogfood/content-publishing/public-claim-policy.json` defines hard boundaries and allowed audit language for AGS public content.

Public AGS claims should stay evidence-based and reviewable. Supported language includes:

- potential governance theater signals
- requires verification
- public materials do not demonstrate
- audit question
- remediation path
- Agentic Governance Auditor
- Governance Reality Report
- Agency Chain Mapper

## Approval Scope

Approval cannot be reused across external channels or targets. A GitHub release approval does not automatically authorize a social post, public website update, or promotional thread.

The hardening eval suite requires fresh governance when the target, channel, content version, reviewer, or time window changes.

## Runtime Substitution

The runtime substitution case approves local draft creation and then attempts external social publication. Runtime Binding must reject that substitution because the runtime action no longer matches the permitted action, tool, target, and action hash.

## Tone And Claim Drift

Governance Memory is used to surface repeated public-claim drift as a human-review concern. It does not mutate policy automatically. It recommends human review and additional eval coverage when repeated blocks appear.

## v1.7.2 Depth Hardening

The depth suite adds 30 deterministic variants covering:

- safe internal drafts and low-risk notes
- scoped reviewed GitHub release notes
- public overclaim variants such as regulator-ready, proves compliance, guarantees agent safety, cryptographically final, auditor-approved, and legal compliance guaranteed
- internal-draft labels with public website, LinkedIn, external audience, or auto-publish metadata
- target-bound approval mismatch and approval reuse
- runtime substitution across tools, targets, channels, and content hashes
- missing runtime permits, missing binding hashes, missing receipt hashes, third-party readability gaps, and receipt integrity gaps
- simulated claim, review-quality, and target-scope drift

Severity calibration matters because AGA should avoid overstating low-risk cases while still catching material gaps. Public overclaim detection should be fair: a refused claim with no execution boundary is lower severity than an allowed public publish with unsupported claims, target mismatch, or hard-boundary conflict.

The false-positive and false-negative calibration manifests live under:

```text
examples/calibration/content-publishing/false-positive/examples.json
examples/calibration/content-publishing/false-negative/examples.json
```

## Agency Chain Mapper

The new agency-chain examples show the difference between a strong content publishing chain and a weak one:

```bash
node packages/cli/dist/cli.js agency-chain examples/agency-chain/content-publishing-strong-chain.json
node packages/cli/dist/cli.js agency-chain examples/agency-chain/content-publishing-weak-chain.json
```

The strong chain demonstrates human authority, policy, hard boundaries, scoped tool access, target-specific approval, participation quality, runtime permit, receipt proof, and governance memory.

The weak chain demonstrates an external public publishing path where approval, participation quality, runtime binding, receipt proof, and memory are not demonstrated.

## Governance Reality Report

The report example summarizes the hardening findings in auditor language:

```bash
node packages/cli/dist/cli.js audit-report examples/audit-report/content-publishing-hardening-report.json --out .tmp/content-publishing-hardening-report.md
```

The report identifies unsupported public claim risk, external review requirements, target/channel approval mismatch, draft versus publish boundary issues, runtime substitution risk, and tone/claim drift risk.

## Limitations

This release does not execute publishing actions, call external services, add hosted APIs, add auth, add databases, or handle customer data. It is a deterministic local hardening pack over existing dogfood, governance, audit-report, agency-chain, Runtime Binding, receipts, and Governance Memory paths.
