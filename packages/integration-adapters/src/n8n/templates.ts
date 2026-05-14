import type { N8nTemplateMetadata } from "./types.js";

export const n8nTemplates = {
  governanceWebhook: {
    id: "ags-governance-webhook",
    name: "AGS Governance Webhook",
    description:
      "Receives a proposed action payload and returns an AGS governance response through a local CLI or future API wrapper.",
    fileName: "ags-governance-webhook.workflow.json"
  },
  beforeHttpRequest: {
    id: "ags-before-http-request",
    name: "AGS Before HTTP Request",
    description:
      "Checks a proposed HTTP action with AGS before an n8n HTTP Request node is allowed to continue.",
    fileName: "ags-before-http-request.workflow.json"
  }
} satisfies Record<string, N8nTemplateMetadata>;
