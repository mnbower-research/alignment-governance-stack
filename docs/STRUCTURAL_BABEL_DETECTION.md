# Structural Babel Detection

Structural Babel Detection is a deterministic audit layer for identifying potential Babel-shaped structural risk in delegated AI systems.

Babel risk is structural, not merely behavioral. Bad outputs are often downstream of collapsed coordination capacity. Structural Babel Detection asks whether capability and coordination are scaling faster than agency, discernment, authority clarity, and accountability.

Structural Babel Detection does not block actions. It produces human-reviewable findings.

## Definition

Structural Babel Detection is an audit/evaluation layer that produces Babel Risk Reports from supplied structural signals. It asks whether a delegated AI system is scaling capability, coordination, automation, language, or memory faster than human agency, discernment, authority clarity, accountability, and proof.

## Why It Exists

AGS already governs action boundaries through PGDL, AAG, Runtime Binding, Decision Closure, receipts, Agency Fingerprints, Governance Memory, Agency Chain Mapper, and Governance Reality Reports. Those layers can show whether particular proposals, permits, actions, proofs, and authority chains are preserved.

Structural Babel Detection sits above that action path. It asks whether the whole system is becoming structurally misaligned even when individual actions appear governed.

Core thesis:

```text
Babel risk appears when capability and coordination scale faster than rightful authority,
human participation, source alignment, refusal capacity, accountability, and proof.
```

Anti-Babel infrastructure does not mean anti-technology. It means power under discernment, agency under authority, delegation under accountability, and execution under proof.

## Relationship To Anti-Babel Infrastructure

Anti-Babel infrastructure preserves human agency as systems scale. Structural Babel Detection contributes the structural audit view: it looks above individual gates and asks whether the whole operating model is preserving authority, participation, refusal capacity, accountability, and proof as coordination power increases.

## Relationship To AGS Layers

- PGDL matures proposals and surfaces objections before execution gating.
- AAG evaluates whether proposed actions should be allowed before execution.
- Runtime Binding verifies that the exact runtime action matches the permit.
- Decision Closure binds the action, authority, decision, conditions, and proof at the execution boundary.
- Receipts preserve tamper-evident governance evidence.
- Agency Fingerprints preserve delegated authority chain identity.
- Governance Memory detects patterns over time for human review.
- Agency Chain Mapper maps where agency was preserved, weakened, bypassed, or not demonstrated.
- Governance Reality Reports convert evidence into professional audit findings.
- Structural Babel Detection evaluates whether the whole structure is scaling in a way that risks agency collapse.

## What It Detects

Structural Babel Detection produces findings for potential signals including:

- capability outrunning discernment
- coordination outrunning authority
- language outrunning meaning
- automation outrunning participation
- memory outrunning review
- proof outrunning reality
- governance theater
- dependency capture
- self-audit circularity
- centralized control without accountability

## What It Does Not Claim

Structural Babel Detection does not claim legal noncompliance, moral guilt, external wrongdoing, production readiness, or safety guarantees. It does not approve, block, or execute actions. It does not replace Governance Reality Reports, Agency Chain Mapper, Agency Fingerprints, PGDL, AAG, Runtime Binding, Decision Closure, receipts, or Governance Memory.

Findings should use careful language: potential signal, not demonstrated, requires review, and recommended remediation.

## Scoring Model

The v0.1 score is deterministic and intentionally simple.

Severity weights:

- low = 1
- medium = 2
- high = 3
- critical = 4

Structural ascent score is normalized to `0..100` from supplied signals and generated findings. Capability and coordination pressure increase risk. Weak authority clarity, weak participation, weak proof continuity, memory without review, agency-chain weakness, fingerprint gaps, unresolved governance report findings, governance theater, and self-audit circularity also increase risk.

Thresholds:

- 0-24: low
- 25-49: medium
- 50-74: high
- 75-100: critical

The score is an audit triage signal, not a certification.

## Example JSON Input

```json
{
  "systemId": "rapid-agent-ops-platform",
  "organizationId": "org-example",
  "workflowId": "cross-department-automation",
  "capabilitySignals": [
    {
      "id": "cap-001",
      "kind": "tool_access",
      "severity": "critical",
      "description": "Agents have access to production-impacting tools across departments.",
      "evidenceRefs": ["tool-access-review"]
    }
  ],
  "authoritySignals": [
    {
      "id": "auth-001",
      "kind": "missing_stop_authority",
      "severity": "critical",
      "evidenceRefs": ["approval-policy-review"]
    }
  ],
  "participationSignals": [
    {
      "id": "part-001",
      "kind": "rubber_stamp_pattern",
      "severity": "high",
      "evidenceRefs": ["approval-sample"]
    }
  ],
  "proofSignals": [
    {
      "id": "proof-001",
      "kind": "unverified_runtime_binding",
      "severity": "critical",
      "evidenceRefs": ["runtime-proof-gap"]
    }
  ]
}
```

## Example Report Output

```json
{
  "version": "babel-risk/v0.1",
  "reportId": "babel-risk-3a8f2c7b0b2d6f41",
  "systemId": "rapid-agent-ops-platform",
  "organizationId": "org-example",
  "workflowId": "cross-department-automation",
  "overallRisk": "critical",
  "structuralAscentScore": 82,
  "findings": [
    {
      "id": "BR-001",
      "category": "capability_outruns_discernment",
      "severity": "critical",
      "confidence": "medium",
      "title": "Capability may be outrunning discernment",
      "summary": "Capability, autonomy, or scope pressure is high while human participation, proof continuity, authority clarity, or proposal scrutiny is weak or not demonstrated. This is a potential signal requiring human review, not a claim of wrongdoing.",
      "evidenceRefs": ["tool-access-review", "approval-policy-review", "approval-sample", "runtime-proof-gap"],
      "recommendedRemediation": [
        "Add explicit proposal scrutiny evidence before expanding autonomy or scope.",
        "Require meaningful human review with refusal power for high-capability workflows.",
        "Bind high-capability actions to runtime permits, receipts, and agency fingerprints."
      ]
    }
  ]
}
```

## Threat Model

Structural Babel Detection is designed to surface potential structural risks such as:

- scaling agents, tools, and autonomy before authority is clear
- cross-department coordination without scoped ownership or stop authority
- shared governance language that does not affect runtime behavior
- human approval after momentum has already committed the system
- memory recommendations changing governance posture without human review
- receipts or reports that are not linked to runtime binding and fingerprints
- governance artifacts that are not live at the consequence boundary
- central control planes that expand faster than accountability channels

## Limitations

Version v0.1 is deterministic and signal-based. It does not use ML, LLMs, external identity providers, network calls, persistence, or action execution. The quality of the report depends on the quality and completeness of supplied signals.

A low score does not certify that a system is safe, compliant, aligned, or production-ready. A high score does not prove wrongdoing. It means the supplied evidence contains structural signals requiring human review.

## Remediation Examples

- Add or update authority maps before expanding workflow scope.
- Define stop authority and refusal channels for central control planes.
- Require meaningful participation with context, timing before commitment, and refusal power.
- Link receipts to runtime binding results, Decision Closure artifacts, and Agency Fingerprints.
- Require human approval before Governance Memory recommendations affect policy.
- Separate internal self-audit from third-party review or external validation claims.
- Preserve fallback procedures and independent review capacity where dependency capture is possible.
