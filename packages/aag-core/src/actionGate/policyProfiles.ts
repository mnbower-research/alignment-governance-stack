import type { PolicyProfile } from "./types";

export const defaultPolicyProfile: PolicyProfile = {
  id: "default",
  name: "Default Policy",
  description: "General fallback policy for proposed AI-agent actions.",
  rules: [],
};

export const launchCopilotPolicyProfile: PolicyProfile = {
  id: "launch-copilot",
  name: "Launch Copilot Policy",
  description:
    "Policy profile for the Launch Copilot demo. Allows internal preparation, requires approval for external/public communication, and blocks destructive or sensitive lead-data actions.",
  rules: [
    {
      actionType: "draft_private_outreach",
      decision: "allow",
      reason: "Drafting is internal preparation. No external effect occurs.",
    },
    {
      actionType: "send_email",
      decision: "require_approval",
      reason: "External communication must be reviewed before sending.",
      requiresReviewPacket: true,
    },
    {
      actionType: "add_lead_note",
      decision: "allow",
      reason: "Low-risk internal record update.",
    },
    {
      actionType: "publish_public_post",
      decision: "require_approval",
      reason:
        "Public communication affects reputation and product positioning.",
      requiresReviewPacket: true,
    },
    {
      actionType: "delete_lead_record",
      decision: "block",
      reason:
        "Destructive lead deletion is blocked by the Launch Copilot policy.",
      requiresReviewPacket: true,
      saferAlternative: "Archive the lead record instead of deleting it.",
    },
    {
      actionType: "export_private_lead_list",
      decision: "block",
      reason: "Private lead export creates data exposure risk.",
      requiresReviewPacket: true,
      saferAlternative: "Request a narrowed, redacted export instead.",
    },
  ],
};

export const strictExternalActionsPolicyProfile: PolicyProfile = {
  id: "strict-external-actions",
  name: "Strict External Actions Policy",
  description:
    "A stricter policy profile for workflows where external effects should require approval and sensitive/destructive actions should be blocked.",
  rules: [],
  defaults: {
    externalEffect: "require_approval",
    highSensitivityData: "block",
    destructiveAction: "block",
    irreversibleAction: "require_approval",
  },
};

export const builtInPolicyProfiles: PolicyProfile[] = [
  defaultPolicyProfile,
  launchCopilotPolicyProfile,
  strictExternalActionsPolicyProfile,
];

export function getPolicyProfileById(
  policyProfileId: string | undefined,
): PolicyProfile | undefined {
  if (!policyProfileId) {
    return undefined;
  }

  return builtInPolicyProfiles.find((profile) => profile.id === policyProfileId);
}
