import type { ApprovalEvidence, AuthorityMap } from "@alignment-governance-stack/authority-map";
import type { EvaluateGovernedRuntimeActionWithReceiptInput } from "@alignment-governance-stack/governance-core";
import type { PolicyProfile } from "@alignment-governance-stack/policy-profiles";
import type {
  CreateRuntimePermitOptions,
  ValidateRuntimePermitOptions
} from "@alignment-governance-stack/runtime-binding";
import type { AgentActionProposal } from "@alignment-governance-stack/shared-types";

export type AgsEvalCategory =
  | "safe_path"
  | "pgdl_revision"
  | "policy_block"
  | "authority_failure"
  | "participation_failure"
  | "aag_block"
  | "runtime_binding_failure"
  | "receipt_integrity"
  | "invalid_policy"
  | "dogfood_workbench";

export interface AgsEvalCase {
  id: string;
  title: string;
  description?: string;
  category: AgsEvalCategory;
  input: {
    proposal: AgentActionProposal;
    runtimeAction?: AgentActionProposal;
    policyProfile?: PolicyProfile;
    authorityMap?: AuthorityMap;
    approvalEvidence?: ApprovalEvidence;
    humanParticipation?: EvaluateGovernedRuntimeActionWithReceiptInput["humanParticipation"];
    permitOptions?: CreateRuntimePermitOptions;
    validationOptions?: ValidateRuntimePermitOptions;
    receiptOptions?: EvaluateGovernedRuntimeActionWithReceiptInput["receiptOptions"];
  };
  expected: AgsEvalExpected;
}

export interface AgsEvalExpected {
  finalDecision?: string;
  pgdlDecision?: string;
  aagDecision?: string;
  policyBlocked?: boolean;
  authorityDecision?: string;
  participationDecision?: string;
  runtimeAllowed?: boolean;
  receiptValid?: boolean;
  requiredReceiptFields?: string[];
  blockedBeforeAag?: boolean;
  proposalSentTool?: string;
  proposalSentActionType?: string;
  hardBoundaryTriggered?: boolean;
  runtimeFailureCodes?: string[];
}

export interface AgsEvalActual {
  finalDecision?: string;
  pgdlDecision?: string;
  aagDecision?: string;
  policyBlocked?: boolean;
  authorityDecision?: string;
  participationDecision?: string;
  runtimeAllowed?: boolean;
  receiptValid?: boolean;
  proposalSentTool?: string;
  proposalSentActionType?: string;
  blockedBeforeAag?: boolean;
  hardBoundaryTriggered?: boolean;
  runtimeFailureCodes?: string[];
}

export interface AgsEvalResult {
  id: string;
  title: string;
  passed: boolean;
  failures: string[];
  actual: AgsEvalActual;
  receiptHash?: string;
}

export interface AgsEvalSuiteResult {
  passed: boolean;
  total: number;
  passedCount: number;
  failedCount: number;
  results: AgsEvalResult[];
}
