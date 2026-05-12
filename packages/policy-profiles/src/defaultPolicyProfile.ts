import type { PolicyProfile } from "./types.js";

export const defaultPolicyProfile: PolicyProfile = {
  id: "ags.default.balanced",
  name: "AGS Balanced Default Policy",
  version: "0.2.0",
  description: "Balanced default policy profile for AGS v0.2 foundation.",
  defaultMode: "balanced",
  receiptRequired: true,
  environments: [
    {
      environment: "production",
      requiresApprovalForIrreversible: true,
      requiresApprovalForExternalFacing: true,
      requiresApprovalForHighSensitivity: true,
      notes: "Production actions receive stricter review requirements."
    }
  ],
  dataSensitivity: [
    {
      sensitivity: "low",
      receiptRequired: true,
      notes: "Low sensitivity internal reversible actions can proceed without extra approval."
    },
    {
      sensitivity: "medium",
      receiptRequired: true
    },
    {
      sensitivity: "high",
      requiresApproval: true,
      externalFacingAllowed: false,
      receiptRequired: true,
      notes: "High sensitivity external-facing actions should not proceed without redesign."
    }
  ],
  metadata: {
    stage: "v0.2-foundation"
  }
};
