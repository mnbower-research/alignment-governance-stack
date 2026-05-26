# Governance Absorption Capacity / Babel Velocity

Governance Absorption Capacity / Babel Velocity is a temporal hardening layer inside Structural Babel Detection. It asks whether meaningful human governance closure is keeping pace with risk-weighted agent decision throughput.

A system becomes Babel-shaped when its decision tempo exceeds its governance absorption capacity.

The lead indicator is not only whether governance artifacts exist, but whether meaningful governance closure can keep pace with consequential agent decisions. Babel Velocity asks whether the gap is widening.

## Definition

Governance Absorption Capacity is the sustainable ceiling of meaningful human review, remediation, audit response, authority maintenance, and proof verification.

Babel Velocity is the temporal risk signal created when risk-weighted agent decisions accelerate faster than quality-weighted governance closure.

## Why The Temporal Layer Exists

Structural Babel Detection v0.1 detects Babel-shaped structure as a snapshot. Governance Absorption Capacity / Babel Velocity detects whether the system is becoming less governable over time.

The real early signal is not only weak authority, weak participation, or missing proof. The lead indicator is when the closing rate of the governance loop falls behind the decision rate of the agent system. If an agent system produces consequential decisions faster than meaningful human review can close, the problem is no longer only policy quality. It is a tempo mismatch.

## Structural State vs Structural Velocity

Structural state asks: does the system currently have authority, participation, proof, memory review, and accountability?

Structural velocity asks: is the gap between consequential decisions and meaningful closure getting wider or narrower?

Locally valid approvals can still produce a globally drowning governance system.

## Governance Closure Ratio

Governance closure ratio compares quality-weighted governance closure rate to risk-weighted decision rate:

```text
governanceClosureRatio =
qualityWeightedClosureRatePerHour / riskWeightedDecisionRatePerHour
```

Convention: if both rates are zero, the ratio is `1`, meaning no current throughput pressure is demonstrated. If decision rate is zero and closure rate is positive, the ratio is also capped safely rather than allowed to explode.

Interpretation:

- `>= 1.0`: keeping pace
- `0.75-0.99`: strained
- `0.5-0.74`: falling behind
- `< 0.5`: structurally drowning

## Expansion Rate vs Review Closure Rate

Babel Velocity compares expansion of consequence-weighted decision throughput against meaningful closure throughput. A system can appear healthy if raw approval counts rise, while still becoming less governable if closure quality declines or high-consequence actions increase.

## Consequence-Weighted Decisions

Low-risk internal actions and high-consequence external actions should not carry the same denominator weight.

Decision weights:

- low = 1
- medium = 2
- high = 4
- critical = 8

## Quality-Weighted Closures

Rubber-stamp approvals do not count as full closures.

Closure weighting includes closure status, participation quality, authority validity, timing before commitment, refusal power, context sufficiency, and scope match. A closure marked `closed` can still receive low weight if it lacks meaningful participation.

## Why Velocity Needs Windows

A single window can calculate current absorption metrics. At least two windows are required to detect whether closure ratio, proof completeness, authority coverage, review lag, remediation load, decision load, or capacity are improving or declining.

## Relationship To AGS Layers

- Human Participation Quality helps distinguish meaningful review from rubber-stamping.
- Agency Fingerprints preserve delegated authority chain identity for actions.
- Receipts preserve governance evidence for later verification.
- Decision Closure binds action, authority, decision, conditions, and proof at the execution boundary.
- Governance Memory can reveal repeated patterns and remediation needs over time.
- Agency Chain Mapper shows where agency links were preserved, weakened, bypassed, or not demonstrated.
- Governance Reality Reports convert evidence into professional audit findings.
- Structural Babel Detection supplies the structural snapshot layer that Babel Velocity hardens with temporal analysis.

## What It Detects

Governance Absorption Capacity / Babel Velocity detects:

- decision rate exceeding closure rate
- closure ratio declining
- raw approvals masking meaningful closure decline
- risk-weighted load accelerating
- review lag increasing
- remediation backlog growing
- authority coverage lagging scope
- proof completeness declining
- capacity ceiling not expanding
- locally valid but globally drowning governance

## What It Does Not Claim

This layer does not approve, block, execute actions, make network calls, mutate governance inputs, auto-update policy, claim legal compliance, assign moral blame, make religious claims as software output, certify safety, or guarantee production readiness.

It produces human-reviewable audit findings.

## Example Input

```json
{
  "systemId": "expanding-agent-workflow",
  "windows": [
    {
      "id": "baseline",
      "from": "2026-05-01T00:00:00.000Z",
      "to": "2026-05-02T00:00:00.000Z",
      "decisionEvents": [
        {
          "id": "d-001",
          "timestamp": "2026-05-01T09:00:00.000Z",
          "kind": "external_publish",
          "consequenceLevel": "medium"
        }
      ],
      "closureEvents": [
        {
          "id": "c-001",
          "timestamp": "2026-05-01T10:00:00.000Z",
          "kind": "human_review",
          "participationQuality": "meaningful",
          "closureStatus": "closed",
          "relatedDecisionIds": ["d-001"],
          "authorityValid": true,
          "beforeCommitment": true,
          "refusalPowerDemonstrated": true,
          "contextSufficient": true,
          "scopeMatched": true
        }
      ]
    }
  ]
}
```

## Example Output

```json
{
  "version": "babel-velocity/v0.1",
  "reportId": "babel-velocity-6a1f0f0c9f5a2c71",
  "overallVelocityRisk": "medium",
  "currentClosureRatio": 0.72,
  "absorptionStatus": "falling_behind",
  "summary": {
    "decisionTempo": "medium",
    "closureCapacity": "weak",
    "closureTrend": "declining",
    "proofTrend": "stable",
    "authorityCoverageTrend": "stable"
  },
  "findings": [
    {
      "id": "BV-001",
      "category": "decision_rate_exceeds_closure_rate",
      "severity": "high",
      "confidence": "medium",
      "title": "Decision tempo exceeds meaningful governance closure"
    }
  ]
}
```

## Threat Model

This layer is designed to surface:

- high-consequence agent decisions hidden inside low raw event counts
- raw approvals increasing while meaningful closure declines
- review lag rising after agent throughput expands
- stale high-severity remediation becoming governance debt
- authority maps failing to keep up with new scopes
- proof artifacts becoming less complete over time
- local approvals that look valid individually but fail as aggregate governance

## Limitations

Version v0.1 uses deterministic temporal events supplied by the caller. It does not infer missing logs, verify identities, contact external systems, or certify that governance is sufficient. The quality of results depends on the completeness and honesty of the input events.

## Remediation Examples

- Throttle high-consequence workflows when closure ratio drops below `1.0`.
- Increase meaningful reviewer capacity before expanding agent scope.
- Separate rubber-stamp approvals from meaningful governance closure metrics.
- Require authority map updates before new workflow scope goes live.
- Close high-severity remediation before accepting more decision throughput.
- Link decisions to receipts, Decision Closure, runtime binding, and Agency Fingerprints.
- Track average closure lag and enforce review before commitment.
