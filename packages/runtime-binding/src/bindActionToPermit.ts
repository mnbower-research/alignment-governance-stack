import type { AgentActionProposal } from "@alignment-governance-stack/shared-types";
import type { RuntimeBindingResult, RuntimePermit, ValidateRuntimePermitOptions } from "./types.js";
import { validateRuntimePermit } from "./validatePermit.js";

export function bindActionToPermit(
  action: AgentActionProposal,
  permit?: RuntimePermit,
  options: ValidateRuntimePermitOptions = {}
): RuntimeBindingResult {
  return validateRuntimePermit(action, permit, options);
}
