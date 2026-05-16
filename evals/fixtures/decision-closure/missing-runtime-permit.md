# Decision Closure Artifact

## Executive Summary

The action reached a public publishing boundary, but runtime permit proof is not demonstrated.

This artifact is intended to be readable by a third party without reconstructing internal logs. It binds the action, authority, decision, conditions, and integrity evidence available at the execution boundary.

## Action

- Action ID: publish-ags-v1-6-0-social-post
- Action type: publish_social_post
- Summary: Publish an AGS v1.6.0 announcement to a public social channel.
- Tool: social.post
- Target: linkedin/ags_v1_6_0_announcement
- Proposed by agent: content-publishing-agent
- Sensitivity: medium
- Reversibility: partially_reversible

## Execution Boundary

- Boundary ID: boundary-linkedin-post
- Boundary type: external_public_publish
- Reached at: 2026-05-16T10:05:02.000Z
- Runtime permit required: true
- Runtime permit ID: not supplied
- Runtime binding hash: not supplied

## Authority

- Authority source: authority_map
- Authority ID: ags.public_claim_reviewer
- Authority name: Public Claim Reviewer
- Reviewer ID: not supplied
- Reviewer role: public_claim_reviewer
- Authority valid: true
- Authority reason: Public claim reviewer is the relevant authority, but runtime permit proof is not demonstrated.

## Decision

- Outcome: require_approval
- Reason: The action reached an external publishing boundary without runtime permit proof.
- Rule IDs: runtime_permit_required_for_external_publish
- Policy profile ID: ags.content-publishing-hardening.policy
- Hard boundary IDs: none
- Human review required: true
- Human review present: false
- Human participation quality: unknown

## Conditions

- Scope: No external publish should proceed until a target-bound runtime permit is issued.
- Expires at: not supplied
- Allowed tools: social.post
- Allowed targets: linkedin/ags_v1_6_0_announcement
- Prohibited targets: none
- Notes: Runtime permit is required for public publishing.

## Proof

- Receipt hash: not supplied
- Previous receipt hash: not supplied
- Signature: not supplied
- Signature algorithm: not supplied
- Canonical hash: 82e2c4993c4bdf07be3c673e875cbf7aeba9db99bc49394bfc6c0667893e479b
- Integrity status: unsigned

The canonical hash excludes mutable proof fields `proof.canonicalHash`, `proof.signature`, and `proof.integrityStatus`; it includes the remaining artifact contents using stable key ordering.

## Findings

### DCA-003 - Runtime permit required but not demonstrated

- Severity: high
- Evidence path: $.executionBoundary.runtimePermitId
- Explanation: The artifact says a runtime permit is required, but no runtime permit ID is present.
- Audit question: Which permit authorized this exact action at the execution boundary?
- Remediation: Attach a scoped runtime permit ID or change the decision to require approval, refuse, block, or escalate.

### DCA-005 - Human review required but not demonstrated

- Severity: high
- Evidence path: $.decision.humanReviewPresent
- Explanation: Human review is required, but the artifact does not demonstrate review was present.
- Audit question: Who reviewed this action before the execution boundary?
- Remediation: Attach human review evidence or change the outcome to require approval, escalate, refuse, or block.

### DCA-009 - Artifact is unsigned

- Severity: low
- Evidence path: $.proof.signature
- Explanation: The artifact is unsigned; integrity rests on the canonical hash only.
- Audit question: Is a signature required for this review context?
- Remediation: Treat unsigned artifacts as hash-bound but not signature-verified, or add signature support when required.

## Audit Questions

- Which runtime permit authorizes this exact public publishing target?
- Which permit authorized this exact action at the execution boundary?
- Who reviewed this action before the execution boundary?
- Is a signature required for this review context?

## Remediation Hints

- Issue a scoped runtime permit before external publication.
- Attach a scoped runtime permit ID or change the decision to require approval, refuse, block, or escalate.
- Attach human review evidence or change the outcome to require approval, escalate, refuse, or block.
- Treat unsigned artifacts as hash-bound but not signature-verified, or add signature support when required.

## Machine-Readable Artifact

```json
{
  "artifactType": "decision_closure",
  "artifactVersion": "1.0",
  "artifactId": "dca-missing-runtime-permit-v1",
  "createdAt": "2026-05-16T10:05:00.000Z",
  "action": {
    "actionId": "publish-ags-v1-6-0-social-post",
    "actionType": "publish_social_post",
    "summary": "Publish an AGS v1.6.0 announcement to a public social channel.",
    "toolName": "social.post",
    "target": "linkedin/ags_v1_6_0_announcement",
    "proposedByAgentId": "content-publishing-agent",
    "sensitivity": "medium",
    "reversibility": "partially_reversible"
  },
  "executionBoundary": {
    "boundaryId": "boundary-linkedin-post",
    "boundaryType": "external_public_publish",
    "reachedAt": "2026-05-16T10:05:02.000Z",
    "runtimePermitRequired": true
  },
  "authority": {
    "authoritySource": "authority_map",
    "authorityId": "ags.public_claim_reviewer",
    "authorityName": "Public Claim Reviewer",
    "reviewerRole": "public_claim_reviewer",
    "authorityValid": true,
    "authorityReason": "Public claim reviewer is the relevant authority, but runtime permit proof is not demonstrated."
  },
  "decision": {
    "outcome": "require_approval",
    "reason": "The action reached an external publishing boundary without runtime permit proof.",
    "ruleIds": [
      "runtime_permit_required_for_external_publish"
    ],
    "policyProfileId": "ags.content-publishing-hardening.policy",
    "humanReviewRequired": true,
    "humanReviewPresent": false,
    "humanParticipationQuality": "unknown"
  },
  "conditions": {
    "scope": "No external publish should proceed until a target-bound runtime permit is issued.",
    "allowedTools": [
      "social.post"
    ],
    "allowedTargets": [
      "linkedin/ags_v1_6_0_announcement"
    ],
    "notes": [
      "Runtime permit is required for public publishing."
    ]
  },
  "proof": {
    "canonicalHash": "82e2c4993c4bdf07be3c673e875cbf7aeba9db99bc49394bfc6c0667893e479b",
    "integrityStatus": "unsigned"
  },
  "auditSummary": {
    "readableWithoutSystemAccess": true,
    "summary": "The action reached a public publishing boundary, but runtime permit proof is not demonstrated.",
    "unresolvedQuestions": [
      "Which runtime permit authorizes this exact public publishing target?"
    ],
    "theaterSignals": [
      "runtime binding not demonstrated"
    ],
    "remediationHints": [
      "Issue a scoped runtime permit before external publication."
    ]
  }
}
```
