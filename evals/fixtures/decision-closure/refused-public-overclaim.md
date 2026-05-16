# Decision Closure Artifact

## Executive Summary

The artifact proves refusal of an unsupported public claim before external publication.

This artifact is intended to be readable by a third party without reconstructing internal logs. It binds the action, authority, decision, conditions, and integrity evidence available at the execution boundary.

## Action

- Action ID: publish-refused-unsupported-claim
- Action type: publish_social_post
- Summary: Refuse a public AGS announcement because the proposed capability claims are unsupported by supplied evidence.
- Tool: social.post
- Target: linkedin/unsupported_ags_claim_refused
- Proposed by agent: content-publishing-agent
- Sensitivity: medium
- Reversibility: partially_reversible

## Execution Boundary

- Boundary ID: boundary-refused-public-claim
- Boundary type: external_public_publish
- Reached at: 2026-05-16T10:20:02.000Z
- Runtime permit required: false
- Runtime permit ID: not supplied
- Runtime binding hash: not supplied

## Authority

- Authority source: policy_profile
- Authority ID: ags.content-publishing-hardening.policy
- Authority name: AGS Public Claim Policy
- Reviewer ID: not supplied
- Reviewer role: public_claim_reviewer
- Authority valid: true
- Authority reason: Policy requires evidence-backed public claims and review before external publication.

## Decision

- Outcome: refuse
- Reason: The proposed public claim is unsupported by available evidence and should be revised before any external release.
- Rule IDs: never_claim_governance_guarantee, public_claim_review_required
- Policy profile ID: ags.content-publishing-hardening.policy
- Hard boundary IDs: never_claim_governance_guarantee
- Human review required: true
- Human review present: true
- Human participation quality: strong

## Conditions

- Scope: No external publish is allowed for unsupported claims; revised evidence-based copy may be reviewed separately.
- Expires at: not supplied
- Allowed tools: none
- Allowed targets: none
- Prohibited targets: linkedin/unsupported_ags_claim_refused
- Notes: Refusal closure proves the public-action boundary did not proceed.

## Proof

- Receipt hash: 22cd87ff6ca11fe03764f6d8ab44180df9b1a8d22585e48a6195c42a01d61f73
- Previous receipt hash: not supplied
- Signature: not supplied
- Signature algorithm: not supplied
- Canonical hash: c09f3c37b825777c194a1feea5dd4a1f337f00c46c89311c6a0f12cec1b5b542
- Integrity status: unsigned

The canonical hash excludes mutable proof fields `proof.canonicalHash`, `proof.signature`, and `proof.integrityStatus`; it includes the remaining artifact contents using stable key ordering.

## Findings

### DCA-009 - Artifact is unsigned

- Severity: low
- Evidence path: $.proof.signature
- Explanation: The artifact is unsigned; integrity rests on the canonical hash only.
- Audit question: Is a signature required for this review context?
- Remediation: Treat unsigned artifacts as hash-bound but not signature-verified, or add signature support when required.

## Audit Questions

- What revised evidence-backed language should be reviewed?
- Is a signature required for this review context?

## Remediation Hints

- Revise the public copy to evidence-backed claims and resubmit for public-claim review.
- Treat unsigned artifacts as hash-bound but not signature-verified, or add signature support when required.

## Machine-Readable Artifact

```json
{
  "artifactType": "decision_closure",
  "artifactVersion": "1.0",
  "artifactId": "dca-refused-public-overclaim-v1",
  "createdAt": "2026-05-16T10:20:00.000Z",
  "action": {
    "actionId": "publish-refused-unsupported-claim",
    "actionType": "publish_social_post",
    "summary": "Refuse a public AGS announcement because the proposed capability claims are unsupported by supplied evidence.",
    "toolName": "social.post",
    "target": "linkedin/unsupported_ags_claim_refused",
    "proposedByAgentId": "content-publishing-agent",
    "sensitivity": "medium",
    "reversibility": "partially_reversible"
  },
  "executionBoundary": {
    "boundaryId": "boundary-refused-public-claim",
    "boundaryType": "external_public_publish",
    "reachedAt": "2026-05-16T10:20:02.000Z",
    "runtimePermitRequired": false
  },
  "authority": {
    "authoritySource": "policy_profile",
    "authorityId": "ags.content-publishing-hardening.policy",
    "authorityName": "AGS Public Claim Policy",
    "reviewerRole": "public_claim_reviewer",
    "authorityValid": true,
    "authorityReason": "Policy requires evidence-backed public claims and review before external publication."
  },
  "decision": {
    "outcome": "refuse",
    "reason": "The proposed public claim is unsupported by available evidence and should be revised before any external release.",
    "ruleIds": [
      "never_claim_governance_guarantee",
      "public_claim_review_required"
    ],
    "policyProfileId": "ags.content-publishing-hardening.policy",
    "hardBoundaryIds": [
      "never_claim_governance_guarantee"
    ],
    "humanReviewRequired": true,
    "humanReviewPresent": true,
    "humanParticipationQuality": "strong"
  },
  "conditions": {
    "scope": "No external publish is allowed for unsupported claims; revised evidence-based copy may be reviewed separately.",
    "allowedTools": [],
    "allowedTargets": [],
    "prohibitedTargets": [
      "linkedin/unsupported_ags_claim_refused"
    ],
    "notes": [
      "Refusal closure proves the public-action boundary did not proceed."
    ]
  },
  "proof": {
    "receiptHash": "22cd87ff6ca11fe03764f6d8ab44180df9b1a8d22585e48a6195c42a01d61f73",
    "canonicalHash": "c09f3c37b825777c194a1feea5dd4a1f337f00c46c89311c6a0f12cec1b5b542",
    "integrityStatus": "unsigned"
  },
  "auditSummary": {
    "readableWithoutSystemAccess": true,
    "summary": "The artifact proves refusal of an unsupported public claim before external publication.",
    "unresolvedQuestions": [
      "What revised evidence-backed language should be reviewed?"
    ],
    "theaterSignals": [
      "unsupported public claim requires verification"
    ],
    "remediationHints": [
      "Revise the public copy to evidence-backed claims and resubmit for public-claim review."
    ]
  }
}
```
