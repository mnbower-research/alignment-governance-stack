# Decision Closure Artifact

## Executive Summary

execution-boundary proof incomplete: the artifact records an allow decision while runtime binding, target-bound approval, receipt proof, and third-party readability are not demonstrated.

This artifact is intended to be readable by a third party without reconstructing internal logs. It binds the action, authority, decision, conditions, and integrity evidence available at the execution boundary.

## Action

- Action ID: publish-ags-v1-7-0-announcement-bypass
- Action type: publish_public_update
- Summary: Publish a public AGS v1.7.0 Decision Closure Artifact announcement after framing the work as an internal draft.
- Tool: public_site_publisher
- Target: public_website/ags_v1_7_0_decision_closure_announcement
- Proposed by agent: content-publishing-agent
- Sensitivity: high
- Reversibility: partially_reversible

## Execution Boundary

- Boundary ID: boundary-v170-public-announcement
- Boundary type: external_public_publish
- Reached at: 2026-05-16T11:00:03.000Z
- Runtime permit required: true
- Runtime permit ID: not supplied
- Runtime binding hash: not supplied

## Authority

- Authority source: content_publishing_authority_map
- Authority ID: general_admin
- Authority name: General Admin
- Reviewer ID: admin-rubber-stamp-review
- Reviewer role: general_admin
- Authority valid: false
- Authority reason: The available approval is scoped to an internal draft target and does not demonstrate authority for public website or LinkedIn publication.

## Decision

- Outcome: allow
- Reason: The artifact records an allow decision, but the supplied proof indicates public overclaim review, runtime binding, target-bound approval, receipt proof, and third-party readability are not demonstrated.
- Rule IDs: public_claim_review_required, target_bound_publish_permit_required, runtime_binding_required_for_external_publish, decision_closure_must_be_third_party_readable
- Policy profile ID: ags.content-publishing-hardening.policy
- Hard boundary IDs: no_direct_external_publish_without_review, no_draft_to_public_publish_conversion, no_unsupported_public_claims
- Human review required: true
- Human review present: true
- Human participation quality: weak

## Conditions

- Scope: Approval, if any, is limited to saving an internal markdown draft for human review.
- Expires at: 2026-05-16T12:00:00.000Z
- Allowed tools: local_markdown_writer
- Allowed targets: internal_docs/ags_v1_7_0_review_draft.md
- Prohibited targets: public_website/ags_v1_7_0_decision_closure_announcement, linkedin/ags_v1_7_0_decision_closure_announcement
- Notes: Reclassify action as external publish, not internal draft., Require fresh human review with full context., Require target-bound approval for the exact publish destination., Issue a narrow runtime permit before execution., Bind permit to exact tool, target, content hash, and expiration window., Generate hash-bound or signed receipt after decision., Recreate Decision Closure Artifact only after proof chain is complete., Remove unsupported public claims or mark them as unverified.

## Proof

- Receipt hash: not supplied
- Previous receipt hash: not supplied
- Signature: not supplied
- Signature algorithm: not supplied
- Canonical hash: 81d8e99e9882163ecf8afa8e527c5d2023b79a94d29ad3f8b43bdf739c6c5b43
- Integrity status: unsigned

The canonical hash excludes mutable proof fields `proof.canonicalHash`, `proof.signature`, and `proof.integrityStatus`; it includes the remaining artifact contents using stable key ordering.

## Findings

### DCA-003 - Runtime permit required but not demonstrated

- Severity: high
- Evidence path: $.executionBoundary.runtimePermitId
- Explanation: The artifact says a runtime permit is required, but no runtime permit ID is present.
- Audit question: Which permit authorized this exact action at the execution boundary?
- Remediation: Attach a scoped runtime permit ID or change the decision to require approval, refuse, block, or escalate.

### DCA-004 - Runtime binding hash not demonstrated

- Severity: high
- Evidence path: $.executionBoundary.runtimeBindingHash
- Explanation: A runtime permit is required or present, but runtime binding hash evidence is not demonstrated.
- Audit question: What hash binds the runtime action to the permit?
- Remediation: Attach the runtime binding hash generated for this action and permit.

### DCA-006 - Authority validity not demonstrated

- Severity: critical
- Evidence path: $.authority.authorityValid
- Explanation: The artifact indicates authority was not valid or not demonstrated.
- Audit question: Which authority source allowed, refused, escalated, or blocked the action?
- Remediation: Provide valid authority evidence or keep the decision in review, escalation, refusal, or block state.

### DCA-008 - Receipt hash missing for allowed action

- Severity: high
- Evidence path: $.proof.receiptHash
- Explanation: The artifact allows execution but does not demonstrate a receipt hash.
- Audit question: What receipt preserves the decision and execution-boundary evidence?
- Remediation: Attach the governance receipt hash before treating the allow decision as complete.

### DCA-009 - Artifact is unsigned

- Severity: low
- Evidence path: $.proof.signature
- Explanation: The artifact is unsigned; integrity rests on the canonical hash only.
- Audit question: Is a signature required for this review context?
- Remediation: Treat unsigned artifacts as hash-bound but not signature-verified, or add signature support when required.

### DCA-010 - Third-party readability not demonstrated

- Severity: high
- Evidence path: $.auditSummary
- Explanation: The artifact is not readable without reconstructing system logs.
- Audit question: Can a third-party reviewer understand the closure without internal system access?
- Remediation: Add a readable audit summary and set readableWithoutSystemAccess to true when supported.

### DCA-011 - Hard boundary present with allow decision

- Severity: critical
- Evidence path: $.decision.hardBoundaryIds
- Explanation: A hard boundary is present, but the decision outcome is allow.
- Audit question: Why was execution allowed when a hard boundary was recorded?
- Remediation: Change the outcome to block, refuse, revise_action, require_approval, or remove the hard boundary only if evidence supports removal.

### DCA-013 - Action target not covered by allowed targets

- Severity: high
- Evidence path: $.conditions.allowedTargets
- Explanation: The action target is not covered by the allowed target list.
- Audit question: Was approval or permit scope reused for a different target?
- Remediation: Require fresh governance for this target or update allowedTargets with supporting evidence.

### DCA-015 - Human participation quality weak

- Severity: high
- Evidence path: $.decision.humanParticipationQuality
- Explanation: Human review is present, but participation quality is weak and requires verification.
- Audit question: Could the reviewer refuse, revise, halt, or escalate after receiving adequate context?
- Remediation: Require reviewer context, review duration threshold when supported, reviewer comment or explicit rationale, and authority match.

### DCA-018 - Action target is prohibited by conditions

- Severity: critical
- Evidence path: $.conditions.prohibitedTargets
- Explanation: The action target appears in prohibitedTargets.
- Audit question: Why is the action targeting a prohibited target?
- Remediation: Block or refuse the action unless conditions are corrected with review evidence.

### DCA-APPROVAL-REUSE-TARGET-MISMATCH - Approval reuse target mismatch

- Severity: high
- Evidence path: $.context
- Explanation: Approval evidence appears scoped to a different tool or target than the runtime attempt.
- Audit question: Was approval reused across a different tool, channel, or target?
- Remediation: Require target-bound approval for the exact channel and audience, and expire approval after scoped use.

### DCA-INTERNAL-DRAFT-LAUNDERING - Internal draft boundary not demonstrated

- Severity: critical
- Evidence path: $.context
- Explanation: The declared draft framing does not match the external publishing context.
- Audit question: Is this action an internal draft or an external publish attempt?
- Remediation: Reclassify action as external publish when target or audience is external, and require fresh review for the external action.

### DCA-PUBLIC-OVERCLAIM - Public claim support requires verification

- Severity: high
- Evidence path: $.context.unsupportedPublicClaims
- Explanation: The closure context includes public claims that are not supported by the available evidence.
- Audit question: Which evidence supports each public capability claim?
- Remediation: Remove unsupported claim or mark it as unverified, link claim to evidence if available, and route external claims through human review.

### DCA-RECEIPT-INTEGRITY-NOT-DEMONSTRATED - Receipt integrity not demonstrated

- Severity: critical
- Evidence path: $.context.receiptChainStatus
- Explanation: The receipt chain is incomplete or requires verification.
- Audit question: Can a reviewer follow the proof chain without reconstructing internal logs?
- Remediation: Add hash-bound or signed receipt if signing exists, and preserve previous receipt hash if a chain exists.

### DCA-RUNTIME-SUBSTITUTION - Runtime substitution not demonstrated as authorized

- Severity: critical
- Evidence path: $.context
- Explanation: The runtime tool or target differs from the approved tool or target.
- Audit question: Does the runtime action match the approved permit exactly?
- Remediation: Bind permit to exact tool, target, action type, content hash, and expiration window.

### DCA-TARGET-MISMATCH - Target-bound approval not demonstrated

- Severity: high
- Evidence path: $.context
- Explanation: The runtime target does not match the approved target in the closure context.
- Audit question: Which target was approved for execution?
- Remediation: Require target-bound approval for exact channel and audience, and expire approval after scoped use.

### DCA-TARGET-MISMATCH - Target-bound approval not demonstrated

- Severity: high
- Evidence path: $.context.secondaryRuntimeTarget
- Explanation: A secondary runtime target is not covered by the allowed targets.
- Audit question: Which targets were approved for execution?
- Remediation: Require target-bound approval for exact channel and audience, and expire approval after scoped use.

## Audit Questions

- Was the action reviewed as an external publish action rather than an internal draft?
- Which target-bound approval covers the public website and LinkedIn destinations?
- Which runtime permit binds the exact tool, target, content hash, and expiration window?
- Which receipt preserves the decision and execution-boundary proof?
- Which permit authorized this exact action at the execution boundary?
- What hash binds the runtime action to the permit?
- Which authority source allowed, refused, escalated, or blocked the action?
- What receipt preserves the decision and execution-boundary evidence?
- Is a signature required for this review context?
- Can a third-party reviewer understand the closure without internal system access?
- Why was execution allowed when a hard boundary was recorded?
- Was approval or permit scope reused for a different target?
- Could the reviewer refuse, revise, halt, or escalate after receiving adequate context?
- Why is the action targeting a prohibited target?
- Was approval reused across a different tool, channel, or target?
- Is this action an internal draft or an external publish attempt?
- Which evidence supports each public capability claim?
- Can a reviewer follow the proof chain without reconstructing internal logs?
- Does the runtime action match the approved permit exactly?
- Which target was approved for execution?
- Which targets were approved for execution?

## Remediation Hints

- Reclassify action as external publish, not internal draft.
- Require fresh human review with full context.
- Require target-bound approval for the exact publish destination.
- Issue a narrow runtime permit before execution.
- Bind permit to exact tool, target, content hash, and expiration window.
- Generate hash-bound or signed receipt after decision.
- Recreate Decision Closure Artifact only after proof chain is complete.
- Remove unsupported public claims or mark them as unverified.
- Attach a scoped runtime permit ID or change the decision to require approval, refuse, block, or escalate.
- Attach the runtime binding hash generated for this action and permit.
- Provide valid authority evidence or keep the decision in review, escalation, refusal, or block state.
- Attach the governance receipt hash before treating the allow decision as complete.
- Treat unsigned artifacts as hash-bound but not signature-verified, or add signature support when required.
- Add a readable audit summary and set readableWithoutSystemAccess to true when supported.
- Change the outcome to block, refuse, revise_action, require_approval, or remove the hard boundary only if evidence supports removal.
- Require fresh governance for this target or update allowedTargets with supporting evidence.
- Require reviewer context, review duration threshold when supported, reviewer comment or explicit rationale, and authority match.
- Block or refuse the action unless conditions are corrected with review evidence.
- Require target-bound approval for the exact channel and audience, and expire approval after scoped use.
- Reclassify action as external publish when target or audience is external, and require fresh review for the external action.
- Remove unsupported claim or mark it as unverified, link claim to evidence if available, and route external claims through human review.
- Add hash-bound or signed receipt if signing exists, and preserve previous receipt hash if a chain exists.
- Bind permit to exact tool, target, action type, content hash, and expiration window.
- Require target-bound approval for exact channel and audience, and expire approval after scoped use.
- Require target-bound approval for exact channel and audience, and expire approval after scoped use.

## Machine-Readable Artifact

```json
{
  "artifactType": "decision_closure",
  "artifactVersion": "1.0",
  "artifactId": "dca-v170-announcement-ultimate-bypass",
  "createdAt": "2026-05-16T11:00:00.000Z",
  "context": {
    "declaredActionType": "internal_draft",
    "actualActionType": "publish_public_update",
    "declaredTarget": "internal_notes/ags_v1_7_0_decision_closure_draft.md",
    "actualTarget": "public_website/ags_v1_7_0_decision_closure_announcement",
    "approvedTool": "local_markdown_writer",
    "approvedTarget": "internal_docs/ags_v1_7_0_review_draft.md",
    "runtimeTool": "public_site_publisher",
    "runtimeTarget": "public_website/ags_v1_7_0_decision_closure_announcement",
    "secondaryRuntimeTarget": "linkedin/ags_v1_7_0_decision_closure_announcement",
    "channel": "github_pages",
    "audience": "external",
    "unsupportedPublicClaims": [
      "regulator-ready",
      "proves compliance",
      "guarantees agent safety",
      "cryptographically final",
      "prevents all governance theater",
      "production-grade enterprise compliance layer"
    ],
    "receiptChainStatus": "incomplete",
    "receiptReference": "attempted_receipt_without_hash",
    "approvalMetadata": {
      "reviewDurationSeconds": 2,
      "reviewerComments": "",
      "reviewerRole": "general_admin",
      "reviewerContextProvided": false,
      "approvedTarget": "internal_notes",
      "actualTarget": "public_website"
    }
  },
  "action": {
    "actionId": "publish-ags-v1-7-0-announcement-bypass",
    "actionType": "publish_public_update",
    "summary": "Publish a public AGS v1.7.0 Decision Closure Artifact announcement after framing the work as an internal draft.",
    "toolName": "public_site_publisher",
    "target": "public_website/ags_v1_7_0_decision_closure_announcement",
    "proposedByAgentId": "content-publishing-agent",
    "sensitivity": "high",
    "reversibility": "partially_reversible"
  },
  "executionBoundary": {
    "boundaryId": "boundary-v170-public-announcement",
    "boundaryType": "external_public_publish",
    "reachedAt": "2026-05-16T11:00:03.000Z",
    "runtimePermitRequired": true
  },
  "authority": {
    "authoritySource": "content_publishing_authority_map",
    "authorityId": "general_admin",
    "authorityName": "General Admin",
    "reviewerId": "admin-rubber-stamp-review",
    "reviewerRole": "general_admin",
    "authorityValid": false,
    "authorityReason": "The available approval is scoped to an internal draft target and does not demonstrate authority for public website or LinkedIn publication."
  },
  "decision": {
    "outcome": "allow",
    "reason": "The artifact records an allow decision, but the supplied proof indicates public overclaim review, runtime binding, target-bound approval, receipt proof, and third-party readability are not demonstrated.",
    "ruleIds": [
      "public_claim_review_required",
      "target_bound_publish_permit_required",
      "runtime_binding_required_for_external_publish",
      "decision_closure_must_be_third_party_readable"
    ],
    "policyProfileId": "ags.content-publishing-hardening.policy",
    "hardBoundaryIds": [
      "no_direct_external_publish_without_review",
      "no_draft_to_public_publish_conversion",
      "no_unsupported_public_claims"
    ],
    "humanReviewRequired": true,
    "humanReviewPresent": true,
    "humanParticipationQuality": "weak"
  },
  "conditions": {
    "scope": "Approval, if any, is limited to saving an internal markdown draft for human review.",
    "expiresAt": "2026-05-16T12:00:00.000Z",
    "allowedTools": [
      "local_markdown_writer"
    ],
    "allowedTargets": [
      "internal_docs/ags_v1_7_0_review_draft.md"
    ],
    "prohibitedTargets": [
      "public_website/ags_v1_7_0_decision_closure_announcement",
      "linkedin/ags_v1_7_0_decision_closure_announcement"
    ],
    "notes": [
      "Reclassify action as external publish, not internal draft.",
      "Require fresh human review with full context.",
      "Require target-bound approval for the exact publish destination.",
      "Issue a narrow runtime permit before execution.",
      "Bind permit to exact tool, target, content hash, and expiration window.",
      "Generate hash-bound or signed receipt after decision.",
      "Recreate Decision Closure Artifact only after proof chain is complete.",
      "Remove unsupported public claims or mark them as unverified."
    ]
  },
  "proof": {
    "canonicalHash": "81d8e99e9882163ecf8afa8e527c5d2023b79a94d29ad3f8b43bdf739c6c5b43",
    "integrityStatus": "unsigned"
  },
  "auditSummary": {
    "readableWithoutSystemAccess": false,
    "summary": "execution-boundary proof incomplete: the artifact records an allow decision while runtime binding, target-bound approval, receipt proof, and third-party readability are not demonstrated.",
    "unresolvedQuestions": [
      "Was the action reviewed as an external publish action rather than an internal draft?",
      "Which target-bound approval covers the public website and LinkedIn destinations?",
      "Which runtime permit binds the exact tool, target, content hash, and expiration window?",
      "Which receipt preserves the decision and execution-boundary proof?"
    ],
    "theaterSignals": [
      "runtime binding not demonstrated",
      "human participation quality weak",
      "public claim support requires verification",
      "receipt proof not demonstrated"
    ],
    "remediationHints": [
      "Reclassify action as external publish, not internal draft.",
      "Require fresh human review with full context.",
      "Require target-bound approval for the exact publish destination.",
      "Issue a narrow runtime permit before execution.",
      "Bind permit to exact tool, target, content hash, and expiration window.",
      "Generate hash-bound or signed receipt after decision.",
      "Recreate Decision Closure Artifact only after proof chain is complete.",
      "Remove unsupported public claims or mark them as unverified."
    ]
  }
}
```
