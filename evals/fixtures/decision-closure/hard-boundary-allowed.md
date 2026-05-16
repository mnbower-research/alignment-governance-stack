# Decision Closure Artifact

## Executive Summary

The artifact records a hard-boundary signal but also records an allow outcome, which requires immediate review.

This artifact is intended to be readable by a third party without reconstructing internal logs. It binds the action, authority, decision, conditions, and integrity evidence available at the execution boundary.

## Action

- Action ID: publish-unsupported-ags-claim
- Action type: publish_social_post
- Summary: Publish a public AGS capability claim that crosses a configured hard boundary.
- Tool: social.post
- Target: linkedin/unsupported_ags_capability_claim
- Proposed by agent: content-publishing-agent
- Sensitivity: medium
- Reversibility: partially_reversible

## Execution Boundary

- Boundary ID: boundary-public-overclaim
- Boundary type: external_public_publish
- Reached at: 2026-05-16T10:10:02.000Z
- Runtime permit required: true
- Runtime permit ID: permit-unsupported-claim
- Runtime binding hash: 34a1778da5389dc8d80d86b6f772f8f5b0ccb5cfe7f8b2da35bd96db457ceef9

## Authority

- Authority source: policy_profile
- Authority ID: not supplied
- Authority name: Public Claim Policy
- Reviewer ID: not supplied
- Reviewer role: not supplied
- Authority valid: true
- Authority reason: The policy profile identified a hard boundary for unsupported public claims.

## Decision

- Outcome: allow
- Reason: Fixture intentionally shows an allow decision despite hard-boundary evidence.
- Rule IDs: never_claim_regulator_ready
- Policy profile ID: ags.content-publishing-hardening.policy
- Hard boundary IDs: never_claim_regulator_ready
- Human review required: true
- Human review present: true
- Human participation quality: unknown

## Conditions

- Scope: Fixture used to demonstrate validation of hard-boundary inconsistency.
- Expires at: not supplied
- Allowed tools: social.post
- Allowed targets: linkedin/unsupported_ags_capability_claim
- Prohibited targets: none
- Notes: A hard boundary should not result in an allow closure.

## Proof

- Receipt hash: cd1791ab03cdf46d6f9ef6fffd096c66399f8874ab47fc7d7d27aa07b46c961d
- Previous receipt hash: not supplied
- Signature: not supplied
- Signature algorithm: not supplied
- Canonical hash: 554569b37177735a119e3364a05bd1c0df2a385a5a91ecd8dcd43276da44aa7f
- Integrity status: unsigned

The canonical hash excludes mutable proof fields `proof.canonicalHash`, `proof.signature`, and `proof.integrityStatus`; it includes the remaining artifact contents using stable key ordering.

## Findings

### DCA-009 - Artifact is unsigned

- Severity: low
- Evidence path: $.proof.signature
- Explanation: The artifact is unsigned; integrity rests on the canonical hash only.
- Audit question: Is a signature required for this review context?
- Remediation: Treat unsigned artifacts as hash-bound but not signature-verified, or add signature support when required.

### DCA-011 - Hard boundary present with allow decision

- Severity: critical
- Evidence path: $.decision.hardBoundaryIds
- Explanation: A hard boundary is present, but the decision outcome is allow.
- Audit question: Why was execution allowed when a hard boundary was recorded?
- Remediation: Change the outcome to block, refuse, revise_action, require_approval, or remove the hard boundary only if evidence supports removal.

## Audit Questions

- Why was the action allowed when a hard boundary was present?
- Is a signature required for this review context?
- Why was execution allowed when a hard boundary was recorded?

## Remediation Hints

- Change the closure outcome to block, refuse, revise_action, or require approval unless evidence supports removing the boundary.
- Treat unsigned artifacts as hash-bound but not signature-verified, or add signature support when required.
- Change the outcome to block, refuse, revise_action, require_approval, or remove the hard boundary only if evidence supports removal.

## Machine-Readable Artifact

```json
{
  "artifactType": "decision_closure",
  "artifactVersion": "1.0",
  "artifactId": "dca-hard-boundary-allowed-v1",
  "createdAt": "2026-05-16T10:10:00.000Z",
  "action": {
    "actionId": "publish-unsupported-ags-claim",
    "actionType": "publish_social_post",
    "summary": "Publish a public AGS capability claim that crosses a configured hard boundary.",
    "toolName": "social.post",
    "target": "linkedin/unsupported_ags_capability_claim",
    "proposedByAgentId": "content-publishing-agent",
    "sensitivity": "medium",
    "reversibility": "partially_reversible"
  },
  "executionBoundary": {
    "boundaryId": "boundary-public-overclaim",
    "boundaryType": "external_public_publish",
    "reachedAt": "2026-05-16T10:10:02.000Z",
    "runtimePermitRequired": true,
    "runtimePermitId": "permit-unsupported-claim",
    "runtimeBindingHash": "34a1778da5389dc8d80d86b6f772f8f5b0ccb5cfe7f8b2da35bd96db457ceef9"
  },
  "authority": {
    "authoritySource": "policy_profile",
    "authorityName": "Public Claim Policy",
    "authorityValid": true,
    "authorityReason": "The policy profile identified a hard boundary for unsupported public claims."
  },
  "decision": {
    "outcome": "allow",
    "reason": "Fixture intentionally shows an allow decision despite hard-boundary evidence.",
    "ruleIds": [
      "never_claim_regulator_ready"
    ],
    "policyProfileId": "ags.content-publishing-hardening.policy",
    "hardBoundaryIds": [
      "never_claim_regulator_ready"
    ],
    "humanReviewRequired": true,
    "humanReviewPresent": true,
    "humanParticipationQuality": "unknown"
  },
  "conditions": {
    "scope": "Fixture used to demonstrate validation of hard-boundary inconsistency.",
    "allowedTools": [
      "social.post"
    ],
    "allowedTargets": [
      "linkedin/unsupported_ags_capability_claim"
    ],
    "notes": [
      "A hard boundary should not result in an allow closure."
    ]
  },
  "proof": {
    "receiptHash": "cd1791ab03cdf46d6f9ef6fffd096c66399f8874ab47fc7d7d27aa07b46c961d",
    "canonicalHash": "554569b37177735a119e3364a05bd1c0df2a385a5a91ecd8dcd43276da44aa7f",
    "integrityStatus": "unsigned"
  },
  "auditSummary": {
    "readableWithoutSystemAccess": true,
    "summary": "The artifact records a hard-boundary signal but also records an allow outcome, which requires immediate review.",
    "unresolvedQuestions": [
      "Why was the action allowed when a hard boundary was present?"
    ],
    "theaterSignals": [
      "hard boundary override risk"
    ],
    "remediationHints": [
      "Change the closure outcome to block, refuse, revise_action, or require approval unless evidence supports removing the boundary."
    ]
  }
}
```
