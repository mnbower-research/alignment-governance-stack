import type { AuthorityMap, AuthorityRole, AuthorityScope } from "@alignment-governance-stack/authority-map";
import type { HumanParticipationPolicy } from "@alignment-governance-stack/human-participation";
import type {
  ApprovalRule,
  HardBoundaryRule,
  PolicyProfile
} from "@alignment-governance-stack/policy-profiles";
import type { DataSensitivity } from "@alignment-governance-stack/shared-types";
import type {
  CompanyAlignmentInput,
  CompanyAlignmentProfile,
  CompanyDataClass,
  CompanyDecisionBoundary,
  CompanyEnvironment,
  CompanyTool
} from "./types.js";
import type {
  AlignmentGap,
  AlignmentGapReport,
  AlignmentGapSeverity,
  AlignmentGapType,
  DetectAlignmentGapsInput,
  DetectAlignmentGapsOptions
} from "./types/alignmentGaps.js";

const severityRank: Record<AlignmentGapSeverity, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3
};

const strictValueKeywords = [
  "human approval",
  "safety",
  "audit",
  "no silent mutation",
  "high sensitivity",
  "authority",
  "hard boundary",
  "never automate"
];

const stopAuthorityKeywords = [
  "security_admin",
  "system_admin",
  "release_admin",
  "compliance_admin",
  "stop",
  "escalation",
  "production",
  "deploy"
];

export function detectAlignmentGaps(
  input: DetectAlignmentGapsInput,
  options: DetectAlignmentGapsOptions = {}
): AlignmentGapReport {
  if (input === null || typeof input !== "object") {
    throw new Error("detectAlignmentGaps input must be an object.");
  }

  const source = input.companyAlignmentProfile ?? input.companyAlignmentInput;
  const tools = source?.tools ?? input.policyProfile?.tools?.map(policyToolToCompanyTool) ?? [];
  const dataClasses = source?.dataClasses ?? [];
  const environments = source?.environments ?? [];
  const boundaries = source?.decisionBoundaries ?? [];
  const roles = source?.roles ?? [];
  const gaps: AlignmentGap[] = [];
  const addGap = createGapAdder(gaps);

  detectConflictingToolsAndBoundaries(addGap, tools, boundaries, input.policyProfile);
  detectMissingAuthority(addGap, tools, boundaries, input.policyProfile, input.authorityMap, roles);
  detectHardBoundaryOverride(addGap, input.authorityMap, roles);
  detectExternalSharingConflicts(addGap, tools, dataClasses);
  detectHighSensitivityWithoutAuthority(addGap, tools, dataClasses, input.authorityMap, roles);
  detectProductionIrreversibleWithoutAuthority(addGap, tools, environments, input.authorityMap, roles);
  detectReviewWithoutParticipation(addGap, tools, boundaries, input.policyProfile, input.participationPolicy);
  detectMissingStopAuthority(addGap, tools, environments, input.authorityMap, roles);
  detectAmbiguousNeverAutomate(addGap, boundaries);
  detectPermissiveDefaultWithStrictValues(addGap, source);
  detectDataClassToolSensitivityMismatch(addGap, tools, dataClasses, boundaries, input.policyProfile);
  detectApprovalRuleWithoutRole(addGap, input.policyProfile, input.authorityMap);
  detectRoleScopeTooBroad(addGap, input.authorityMap);
  detectPolicyBoundaryConflicts(addGap, boundaries, input.policyProfile);
  detectUnownedHighRiskTools(addGap, tools, input.authorityMap, roles);
  detectUnownedHighSensitivityData(addGap, dataClasses, input.authorityMap, roles);
  detectInconsistentEnvironmentRules(addGap, environments, source);

  const filteredGaps =
    options.includeLowSeverity === false ? gaps.filter((gap) => gap.severity !== "low") : gaps;
  const highestSeverity = findHighestSeverity(filteredGaps);
  const reportBase = {
    id: `alignment-gap-report-${stableIdPart(source?.id ?? input.policyProfile?.id ?? "input")}`,
    version: "ags.alignment-gap.v1.3" as const,
    createdAt: options.now ?? new Date().toISOString(),
    ...(source?.id !== undefined ? { inputId: source.id } : {}),
    ...(source?.name !== undefined ? { inputName: source.name } : {}),
    gapCount: filteredGaps.length,
    ...(highestSeverity !== undefined ? { highestSeverity } : {}),
    gaps: filteredGaps,
    humanReviewRequired: true as const,
    ...(input.metadata !== undefined ? { metadata: input.metadata } : {})
  };

  return {
    ...reportBase,
    summary: summarizeAlignmentGapReport(reportBase)
  };
}

export function summarizeAlignmentGapReport(
  report: Omit<AlignmentGapReport, "summary"> | AlignmentGapReport
): string {
  const highest = report.highestSeverity ?? "none";

  return [
    "AGS Alignment Gap Report",
    `gap count: ${report.gapCount}`,
    `highest severity: ${highest}`,
    "human review required: true",
    "No policy profiles, authority maps, or participation policies were mutated."
  ].join("\n");
}

function detectConflictingToolsAndBoundaries(
  addGap: GapAdder,
  tools: CompanyTool[],
  boundaries: CompanyDecisionBoundary[],
  policyProfile?: PolicyProfile
): void {
  for (const tool of tools.filter((entry) => entry.allowed !== false)) {
    const matchingBoundary = boundaries.find(
      (boundary) => boundary.neverAutomate === true && matchesToolBoundary(tool, boundary)
    );
    const matchingHardBoundary = policyProfile?.hardBoundaries?.find((boundary) =>
      matchesToolHardBoundary(tool, boundary)
    );

    if (matchingBoundary !== undefined || matchingHardBoundary !== undefined) {
      addGap("conflicting_tool_and_boundary", tool.externalFacing === true ? "critical" : "high", {
        title: "Allowed tool conflicts with a hard boundary",
        description: `${tool.tool} is marked allowed while a never-automate or hard-boundary rule blocks the same governance surface.`,
        affectedItems: [tool.tool, matchingBoundary?.id, matchingHardBoundary?.id].filter(isString),
        recommendation: "Resolve whether this tool is allowed or blocked before generating enforceable policy.",
        metadata: { tool: tool.tool }
      });
    }
  }
}

function detectMissingAuthority(
  addGap: GapAdder,
  tools: CompanyTool[],
  boundaries: CompanyDecisionBoundary[],
  policyProfile: PolicyProfile | undefined,
  authorityMap: AuthorityMap | undefined,
  companyRoles: { id: string; label: string; canApprove?: string[] }[]
): void {
  const requiredSurfaces: ApprovalSurface[] = [
    ...tools
      .filter((tool) => tool.requiresApproval === true)
      .map((tool) =>
        createApprovalSurface({
          id: tool.tool,
          tool: tool.tool,
          dataSensitivity: tool.maxDataSensitivity
        })
      ),
    ...boundaries
      .filter((boundary) => boundary.requiresHumanApproval === true)
      .map((boundary) =>
        createApprovalSurface({
          id: boundary.id,
          tool: boundary.tool,
          actionType: boundary.actionType,
          environment: boundary.environment,
          dataSensitivity: boundary.dataSensitivity,
          externalFacing: boundary.externalFacing,
          targetIncludes: boundary.targetIncludes,
          approverRole: boundary.approverRole
        })
      ),
    ...(policyProfile?.approvalRules ?? [])
      .filter((rule) => rule.requiresApproval === true)
      .map((rule) => createApprovalSurface({
        id: rule.id,
        ...rule.when,
        approverRole: rule.approverRole
      }))
  ];

  for (const surface of requiredSurfaces) {
    if (!hasAuthorityForSurface(surface, authorityMap, companyRoles)) {
      addGap("missing_authority_for_required_approval", "high", {
        title: "Required approval has no matching authority",
        description: `${surface.id} requires approval, but no authority role appears scoped to approve it.`,
        affectedItems: [surface.id],
        recommendation: "Add or scope an authority role before relying on this approval requirement.",
        metadata: { ...surface }
      });
    }
  }
}

function detectHardBoundaryOverride(
  addGap: GapAdder,
  authorityMap: AuthorityMap | undefined,
  companyRoles: { id: string; label: string; canApprove?: string[]; notes?: string }[]
): void {
  for (const role of authorityMap?.roles ?? []) {
    const roleText = searchable([
      role.id,
      role.label,
      role.description,
      JSON.stringify(role.metadata ?? {}),
      ...role.scopes.flatMap((scope) => [
        scope.id,
        scope.tool,
        scope.actionType,
        scope.environment,
        scope.targetIncludes,
        scope.notes,
        ...(scope.approvalKinds ?? [])
      ])
    ]);

    if (
      (role as { canOverrideHardBoundaries?: unknown }).canOverrideHardBoundaries === true ||
      roleText.includes("override_hard_boundary") ||
      roleText.includes("hard boundary override")
    ) {
      addGap("hard_boundary_override_claim", "critical", {
        title: "Authority role claims hard-boundary override",
        description: `${role.id} appears to claim authority to override hard boundaries.`,
        affectedItems: [role.id],
        recommendation: "Remove hard-boundary override claims; AGS hard boundaries cannot be approved around.",
        metadata: { roleId: role.id }
      });
    }
  }

  for (const role of companyRoles) {
    const approvals = role.canApprove ?? [];
    const text = searchable([role.id, role.label, role.notes, ...approvals]);

    if (
      approvals.some((entry) =>
        ["hard_boundary", "never_automate", "override_hard_boundary"].includes(entry)
      ) ||
      text.includes("override hard boundary")
    ) {
      addGap("hard_boundary_override_claim", "critical", {
        title: "Company role claims hard-boundary override",
        description: `${role.id} canApprove metadata suggests hard boundaries can be overridden.`,
        affectedItems: [role.id],
        recommendation: "Treat this as a governance design error and remove the override claim.",
        metadata: { roleId: role.id }
      });
    }
  }
}

function detectExternalSharingConflicts(
  addGap: GapAdder,
  tools: CompanyTool[],
  dataClasses: CompanyDataClass[]
): void {
  const restrictedData = dataClasses.filter(
    (dataClass) =>
      dataClass.externalSharingAllowed === false &&
      (dataClass.sensitivity === "medium" || dataClass.sensitivity === "high")
  );
  const externalTools = tools.filter(
    (tool) => tool.allowed !== false && tool.externalFacing === true && isExternalSharingTool(tool)
  );

  for (const dataClass of restrictedData) {
    for (const tool of externalTools) {
      if (canTouchSensitivity(tool, dataClass.sensitivity)) {
        addGap("external_sharing_conflict", dataClass.sensitivity === "high" ? "critical" : "high", {
          title: "External sharing conflicts with data rules",
          description: `${tool.tool} can face externally while ${dataClass.id} forbids external sharing.`,
          affectedItems: [tool.tool, dataClass.id],
          recommendation: "Restrict the tool, lower its data sensitivity reach, or add a hard boundary.",
          metadata: { tool: tool.tool, dataClassId: dataClass.id }
        });
      }
    }
  }
}

function detectHighSensitivityWithoutAuthority(
  addGap: GapAdder,
  tools: CompanyTool[],
  dataClasses: CompanyDataClass[],
  authorityMap: AuthorityMap | undefined,
  companyRoles: { id: string; label: string; canApprove?: string[] }[]
): void {
  const highDataClasses = dataClasses.filter((dataClass) => dataClass.sensitivity === "high");
  const highTouchTools = tools.filter((tool) => tool.allowed !== false && canTouchSensitivity(tool, "high"));

  if (
    highDataClasses.length > 0 &&
    highTouchTools.length > 0 &&
    !hasHighSensitivityAuthority(authorityMap, companyRoles)
  ) {
    addGap("high_sensitivity_without_authority", "high", {
      title: "High-sensitivity data lacks authority coverage",
      description: "High-sensitivity data exists and tools can touch it, but no role appears scoped to approve or own it.",
      affectedItems: [...highDataClasses.map((entry) => entry.id), ...highTouchTools.map((entry) => entry.tool)],
      recommendation: "Define data-owner, security, or high-sensitivity authority scopes.",
      metadata: { dataClassCount: highDataClasses.length, toolCount: highTouchTools.length }
    });
  }
}

function detectProductionIrreversibleWithoutAuthority(
  addGap: GapAdder,
  tools: CompanyTool[],
  environments: CompanyEnvironment[],
  authorityMap: AuthorityMap | undefined,
  companyRoles: { id: string; label: string; canApprove?: string[] }[]
): void {
  const hasProduction = environments.some((environment) => isProductionLike(environment));
  const destructiveTools = tools.filter((tool) => tool.allowed !== false && tool.destructive === true);

  if (hasProduction && destructiveTools.length > 0 && !hasProductionIrreversibleAuthority(authorityMap, companyRoles)) {
    addGap("production_irreversible_without_authority", "critical", {
      title: "Production irreversible actions lack authority",
      description: "Production-like environments and destructive tools exist without a scoped production/irreversible approver.",
      affectedItems: destructiveTools.map((tool) => tool.tool),
      recommendation: "Add explicit authority for production irreversible actions or block them.",
      metadata: { destructiveTools: destructiveTools.map((tool) => tool.tool) }
    });
  }
}

function detectReviewWithoutParticipation(
  addGap: GapAdder,
  tools: CompanyTool[],
  boundaries: CompanyDecisionBoundary[],
  policyProfile: PolicyProfile | undefined,
  participationPolicy: HumanParticipationPolicy | undefined
): void {
  const reviewRequired =
    tools.some((tool) => tool.requiresApproval === true || tool.destructive === true) ||
    boundaries.some((boundary) => boundary.requiresHumanApproval === true) ||
    (policyProfile?.approvalRules ?? []).some((rule) => rule.requiresApproval === true);

  if (!reviewRequired) {
    return;
  }

  if (
    participationPolicy === undefined ||
    participationPolicy.requireReasonForHighRisk !== true ||
    participationPolicy.requireContextForHighRisk !== true
  ) {
    addGap("review_required_without_participation_policy", "high", {
      title: "Approval is required without meaningful participation policy",
      description: "The governance input requires review, but no participation policy requires reason and context for high-risk actions.",
      recommendation: "Add a human participation policy that requires reasoned review for high-risk approvals.",
      affectedItems: participationPolicy === undefined ? ["participationPolicy"] : [participationPolicy.id],
      metadata: { participationPolicyId: participationPolicy?.id }
    });
  }
}

function detectMissingStopAuthority(
  addGap: GapAdder,
  tools: CompanyTool[],
  environments: CompanyEnvironment[],
  authorityMap: AuthorityMap | undefined,
  companyRoles: { id: string; label: string; canApprove?: string[]; notes?: string }[]
): void {
  const needsStopAuthority =
    environments.some((environment) => isProductionLike(environment)) ||
    tools.some((tool) => tool.destructive === true || tool.externalFacing === true || tool.requiresApproval === true);

  if (!needsStopAuthority) {
    return;
  }

  const roleTexts = [
    ...(authorityMap?.roles ?? []).map((role) =>
      searchable([
        role.id,
        role.label,
        role.description,
        ...role.scopes.flatMap((scope) => [scope.id, scope.environment, scope.tool, scope.actionType, scope.notes])
      ])
    ),
    ...companyRoles.map((role) => searchable([role.id, role.label, role.notes, ...(role.canApprove ?? [])]))
  ];

  if (!roleTexts.some((text) => stopAuthorityKeywords.some((keyword) => text.includes(keyword)))) {
    addGap("missing_stop_authority", "high", {
      title: "No named stop authority",
      description: "The deployment plan has high-risk surfaces but no named role appears capable of stopping, escalating, or reviewing production actions.",
      recommendation: "Name a security, release, compliance, or escalation authority before deployment.",
      affectedItems: ["authorityMap"]
    });
  }
}

function detectAmbiguousNeverAutomate(
  addGap: GapAdder,
  boundaries: CompanyDecisionBoundary[]
): void {
  for (const boundary of boundaries) {
    if (boundary.neverAutomate === true && !hasBoundaryMatchFields(boundary)) {
      addGap("ambiguous_never_automate_boundary", "medium", {
        title: "Never-automate boundary lacks match fields",
        description: `${boundary.id} says never automate, but does not specify tool, action, target, environment, sensitivity, exposure, or reversibility.`,
        affectedItems: [boundary.id],
        recommendation: "Add deterministic match fields so the boundary can compile into a hard boundary.",
        metadata: { boundaryId: boundary.id }
      });
    }
  }
}

function detectPermissiveDefaultWithStrictValues(
  addGap: GapAdder,
  source: CompanyAlignmentInput | CompanyAlignmentProfile | undefined
): void {
  if (source?.defaultMode !== "permissive") {
    return;
  }

  const valueText = searchable(
    source.values?.flatMap((value) => [value.label, value.description, value.governanceImplication]) ?? []
  );

  if (strictValueKeywords.some((keyword) => valueText.includes(keyword))) {
    addGap("permissive_default_with_strict_values", "medium", {
      title: "Permissive default conflicts with strict governance values",
      description: "The profile default is permissive while company values call for approval, audit, authority, or hard boundaries.",
      recommendation: "Review whether balanced or strict default mode better matches the stated governance values.",
      affectedItems: [source.id]
    });
  }
}

function detectDataClassToolSensitivityMismatch(
  addGap: GapAdder,
  tools: CompanyTool[],
  dataClasses: CompanyDataClass[],
  boundaries: CompanyDecisionBoundary[],
  policyProfile: PolicyProfile | undefined
): void {
  for (const tool of tools) {
    if (tool.maxDataSensitivity !== "low") {
      continue;
    }

    const matchedHighData = dataClasses.find(
      (dataClass) =>
        dataClass.sensitivity !== "low" &&
        textMatchesToolOrBoundary(dataClass.id, tool, boundaries)
    );

    if (matchedHighData !== undefined) {
      addGap("data_class_tool_sensitivity_mismatch", "medium", {
        title: "Tool sensitivity limit conflicts with related data class",
        description: `${tool.tool} is marked low-sensitivity, but related data class ${matchedHighData.id} is ${matchedHighData.sensitivity}.`,
        affectedItems: [tool.tool, matchedHighData.id],
        recommendation: "Align the tool sensitivity limit with the data class it handles.",
        metadata: { tool: tool.tool, dataClassId: matchedHighData.id }
      });
    }
  }

  const highToolsWithoutApproval = tools.filter(
    (tool) => canTouchSensitivity(tool, "high") && tool.requiresApproval !== true
  );
  const highPolicyRequiresReceipt = (policyProfile?.dataSensitivity ?? []).some(
    (entry) => entry.sensitivity === "high" && (entry.requiresApproval === true || entry.receiptRequired === true)
  );

  if (highToolsWithoutApproval.length > 0 && highPolicyRequiresReceipt === false) {
    addGap("data_class_tool_sensitivity_mismatch", "high", {
      title: "High-sensitivity tool lacks approval or receipt policy",
      description: "A tool can touch high-sensitivity data without a matching approval or receipt requirement.",
      affectedItems: highToolsWithoutApproval.map((tool) => tool.tool),
      recommendation: "Require approval and receipts for high-sensitivity tool usage."
    });
  }
}

function detectApprovalRuleWithoutRole(
  addGap: GapAdder,
  policyProfile: PolicyProfile | undefined,
  authorityMap: AuthorityMap | undefined
): void {
  const roleIds = new Set((authorityMap?.roles ?? []).map((role) => role.id));

  for (const rule of policyProfile?.approvalRules ?? []) {
    if (rule.approverRole !== undefined && !roleIds.has(rule.approverRole)) {
      addGap("approval_rule_without_role", "high", {
        title: "Approval rule references a missing role",
        description: `${rule.id} requires ${rule.approverRole}, but that role is absent from the authority map.`,
        affectedItems: [rule.id, rule.approverRole],
        recommendation: "Add the role to the authority map or update the approval rule.",
        metadata: { ruleId: rule.id, approverRole: rule.approverRole }
      });
    }
  }
}

function detectRoleScopeTooBroad(addGap: GapAdder, authorityMap: AuthorityMap | undefined): void {
  for (const role of authorityMap?.roles ?? []) {
    if (!appearsHighAuthority(role)) {
      continue;
    }

    const broadScope = role.scopes.find((scope) => isScopeBroad(scope));

    if (broadScope !== undefined) {
      addGap("role_scope_too_broad", "high", {
        title: "High-authority role has an unconstrained scope",
        description: `${role.id} includes scope ${broadScope.id} without deterministic boundaries.`,
        affectedItems: [role.id, broadScope.id],
        recommendation: "Constrain high-authority scopes by tool, action, environment, sensitivity, target, or exposure.",
        metadata: { roleId: role.id, scopeId: broadScope.id }
      });
    }
  }
}

function detectPolicyBoundaryConflicts(
  addGap: GapAdder,
  boundaries: CompanyDecisionBoundary[],
  policyProfile: PolicyProfile | undefined
): void {
  if (policyProfile === undefined) {
    return;
  }

  for (const boundary of boundaries.filter(
    (entry) => entry.neverAutomate === true && hasBoundaryMatchFields(entry)
  )) {
    const matchingHardBoundary = policyProfile.hardBoundaries?.find((hardBoundary) =>
      matchesBoundaryHardBoundary(boundary, hardBoundary)
    );
    const matchingAllowedTool = policyProfile.tools?.find(
      (tool) =>
        tool.allowed === true &&
        boundary.tool !== undefined &&
        tool.tool === boundary.tool &&
        tool.externalFacingAllowed !== false
    );

    if (matchingHardBoundary === undefined || matchingAllowedTool !== undefined) {
      addGap("policy_allows_what_company_boundary_forbids", "high", {
        title: "Policy does not enforce a company never-automate boundary",
        description: `${boundary.id} is a deterministic never-automate boundary, but the supplied policy does not enforce it cleanly.`,
        affectedItems: [boundary.id, matchingAllowedTool?.tool].filter(isString),
        recommendation: "Add a matching hard boundary and remove conflicting allow rules.",
        metadata: { boundaryId: boundary.id }
      });
    }
  }
}

function detectUnownedHighRiskTools(
  addGap: GapAdder,
  tools: CompanyTool[],
  authorityMap: AuthorityMap | undefined,
  companyRoles: { id: string; label: string; canApprove?: string[] }[]
): void {
  for (const tool of tools.filter(
    (entry) => entry.destructive === true || entry.externalFacing === true || entry.requiresApproval === true
  )) {
    if (!hasAuthorityForSurface({ id: tool.tool, tool: tool.tool }, authorityMap, companyRoles)) {
      addGap("unowned_high_risk_tool", tool.destructive === true ? "high" : "medium", {
        title: "High-risk tool has no owner",
        description: `${tool.tool} is high-risk but no authority role appears to own it.`,
        affectedItems: [tool.tool],
        recommendation: "Assign explicit authority ownership for this tool.",
        metadata: { tool: tool.tool }
      });
    }
  }
}

function detectUnownedHighSensitivityData(
  addGap: GapAdder,
  dataClasses: CompanyDataClass[],
  authorityMap: AuthorityMap | undefined,
  companyRoles: { id: string; label: string; canApprove?: string[] }[]
): void {
  const unowned = dataClasses.filter(
    (dataClass) =>
      dataClass.sensitivity === "high" &&
      !hasAuthorityForSurface(
        { id: dataClass.id, dataSensitivity: "high", targetIncludes: dataClass.id },
        authorityMap,
        companyRoles
      )
  );

  if (unowned.length > 0) {
    addGap("unowned_high_sensitivity_data", "high", {
      title: "High-sensitivity data lacks an owner",
      description: "One or more high-sensitivity data classes lack explicit authority ownership.",
      affectedItems: unowned.map((dataClass) => dataClass.id),
      recommendation: "Assign data-owner or security authority for each high-sensitivity data class.",
      metadata: { dataClassIds: unowned.map((dataClass) => dataClass.id) }
    });
  }
}

function detectInconsistentEnvironmentRules(
  addGap: GapAdder,
  environments: CompanyEnvironment[],
  source: CompanyAlignmentInput | CompanyAlignmentProfile | undefined
): void {
  const strictText = searchable(
    source?.values?.flatMap((value) => [value.label, value.description, value.governanceImplication]) ?? []
  );
  const strictValues = strictValueKeywords.some((keyword) => strictText.includes(keyword));

  for (const environment of environments) {
    if (!isProductionLike(environment)) {
      continue;
    }

    if (
      strictValues &&
      (environment.requiresApprovalForExternalFacing === false ||
        environment.requiresApprovalForHighSensitivity === false ||
        environment.requiresApprovalForIrreversible === false)
    ) {
      addGap("inconsistent_environment_rules", "high", {
        title: "Production environment rules conflict with governance values",
        description: `${environment.id} disables approval for a high-risk production surface while values call for review or authority.`,
        affectedItems: [environment.id],
        recommendation: "Align production environment approval requirements with the stated governance values.",
        metadata: { environmentId: environment.id }
      });
    }
  }
}

type GapAdder = (
  type: AlignmentGapType,
  severity: AlignmentGapSeverity,
  details: Omit<AlignmentGap, "id" | "type" | "severity" | "humanReviewRequired">
) => void;

interface ApprovalSurface {
  id: string;
  tool?: string;
  actionType?: string;
  environment?: string;
  dataSensitivity?: DataSensitivity;
  externalFacing?: boolean;
  targetIncludes?: string;
  approverRole?: string;
}

function createApprovalSurface(surface: {
  id: string;
  tool?: string | undefined;
  actionType?: string | undefined;
  environment?: string | undefined;
  dataSensitivity?: DataSensitivity | undefined;
  externalFacing?: boolean | undefined;
  targetIncludes?: string | undefined;
  approverRole?: string | undefined;
}): ApprovalSurface {
  return {
    id: surface.id,
    ...(surface.tool !== undefined ? { tool: surface.tool } : {}),
    ...(surface.actionType !== undefined ? { actionType: surface.actionType } : {}),
    ...(surface.environment !== undefined ? { environment: surface.environment } : {}),
    ...(surface.dataSensitivity !== undefined ? { dataSensitivity: surface.dataSensitivity } : {}),
    ...(surface.externalFacing !== undefined ? { externalFacing: surface.externalFacing } : {}),
    ...(surface.targetIncludes !== undefined ? { targetIncludes: surface.targetIncludes } : {}),
    ...(surface.approverRole !== undefined ? { approverRole: surface.approverRole } : {})
  };
}

function createGapAdder(gaps: AlignmentGap[]): GapAdder {
  return (type, severity, details) => {
    gaps.push({
      id: `${type}-${gaps.length + 1}`,
      type,
      severity,
      ...details,
      humanReviewRequired: true
    });
  };
}

function hasAuthorityForSurface(
  surface: ApprovalSurface,
  authorityMap: AuthorityMap | undefined,
  companyRoles: { id: string; label: string; canApprove?: string[] }[]
): boolean {
  if (surface.approverRole !== undefined) {
    return (authorityMap?.roles ?? []).some((role) => role.id === surface.approverRole);
  }

  const roleHasScope = (authorityMap?.roles ?? []).some((role) =>
    role.scopes.some((scope) => scopeCoversSurface(scope, surface))
  );

  if (roleHasScope) {
    return true;
  }

  return companyRoles.some((role) => companyRoleCoversSurface(role, surface));
}

function scopeCoversSurface(scope: AuthorityScope, surface: ApprovalSurface): boolean {
  const explicitScope =
    scope.tool !== undefined ||
    scope.actionType !== undefined ||
    scope.environment !== undefined ||
    scope.dataSensitivity !== undefined ||
    scope.maxDataSensitivity !== undefined ||
    scope.externalFacing !== undefined ||
    scope.targetIncludes !== undefined;

  if (!explicitScope) {
    return false;
  }

  if (scope.tool !== undefined && surface.tool !== undefined && scope.tool !== surface.tool) {
    return false;
  }

  if (scope.actionType !== undefined && surface.actionType !== undefined && scope.actionType !== surface.actionType) {
    return false;
  }

  if (scope.environment !== undefined && surface.environment !== undefined && scope.environment !== surface.environment) {
    return false;
  }

  if (
    scope.dataSensitivity !== undefined &&
    surface.dataSensitivity !== undefined &&
    scope.dataSensitivity !== surface.dataSensitivity
  ) {
    return false;
  }

  if (
    scope.maxDataSensitivity !== undefined &&
    surface.dataSensitivity !== undefined &&
    compareSensitivity(scope.maxDataSensitivity, surface.dataSensitivity) < 0
  ) {
    return false;
  }

  if (
    scope.externalFacing !== undefined &&
    surface.externalFacing !== undefined &&
    scope.externalFacing !== surface.externalFacing
  ) {
    return false;
  }

  if (
    scope.targetIncludes !== undefined &&
    surface.targetIncludes !== undefined &&
    !surface.targetIncludes.includes(scope.targetIncludes)
  ) {
    return false;
  }

  return true;
}

function companyRoleCoversSurface(
  role: { id: string; label: string; canApprove?: string[] },
  surface: ApprovalSurface
): boolean {
  const approvals = new Set(role.canApprove ?? []);
  const roleText = searchable([role.id, role.label, ...(role.canApprove ?? [])]);

  return (
    (surface.dataSensitivity === "high" && approvals.has("high_sensitivity")) ||
    (surface.externalFacing === true && approvals.has("external_facing")) ||
    (surface.environment === "production" && approvals.has("production")) ||
    (surface.tool !== undefined && roleText.includes(surface.tool)) ||
    roleText.includes("security_admin") ||
    roleText.includes("release_admin") ||
    roleText.includes("finance_admin") ||
    roleText.includes("data_owner")
  );
}

function hasHighSensitivityAuthority(
  authorityMap: AuthorityMap | undefined,
  companyRoles: { id: string; label: string; canApprove?: string[] }[]
): boolean {
  return hasAuthorityForSurface({ id: "high_sensitivity", dataSensitivity: "high" }, authorityMap, companyRoles);
}

function hasProductionIrreversibleAuthority(
  authorityMap: AuthorityMap | undefined,
  companyRoles: { id: string; label: string; canApprove?: string[] }[]
): boolean {
  const authorityScope = (authorityMap?.roles ?? []).some((role) =>
    role.scopes.some(
      (scope) =>
        scope.environment === "production" ||
        scope.reversible === false ||
        searchable([role.id, role.label, scope.id, scope.notes]).includes("release_admin")
    )
  );

  if (authorityScope) {
    return true;
  }

  return companyRoles.some((role) => {
    const approvals = role.canApprove ?? [];
    const text = searchable([role.id, role.label, ...approvals]);

    return (
      (approvals.includes("production") && approvals.includes("irreversible")) ||
      text.includes("release_admin") ||
      text.includes("security_admin")
    );
  });
}

function matchesToolBoundary(tool: CompanyTool, boundary: CompanyDecisionBoundary): boolean {
  if (boundary.tool !== undefined && boundary.tool === tool.tool) {
    return true;
  }

  if (boundary.actionType !== undefined && tool.notes !== undefined && includesNormalized(tool.notes, boundary.actionType)) {
    return true;
  }

  return boundary.externalFacing === true && tool.externalFacing === true;
}

function matchesToolHardBoundary(tool: CompanyTool, boundary: HardBoundaryRule): boolean {
  return boundary.when.tool === tool.tool || (boundary.when.externalFacing === true && tool.externalFacing === true);
}

function matchesBoundaryHardBoundary(boundary: CompanyDecisionBoundary, hardBoundary: HardBoundaryRule): boolean {
  return (
    fieldMatches(boundary.tool, hardBoundary.when.tool) &&
    fieldMatches(boundary.actionType, hardBoundary.when.actionType) &&
    fieldMatches(boundary.environment, hardBoundary.when.environment) &&
    fieldMatches(boundary.dataSensitivity, hardBoundary.when.dataSensitivity) &&
    fieldMatches(boundary.targetIncludes, hardBoundary.when.targetIncludes) &&
    fieldMatches(boundary.externalFacing, hardBoundary.when.externalFacing) &&
    fieldMatches(boundary.reversible, hardBoundary.when.reversible)
  );
}

function fieldMatches<T>(expected: T | undefined, actual: T | undefined): boolean {
  return expected === undefined || actual === expected;
}

function hasBoundaryMatchFields(boundary: CompanyDecisionBoundary): boolean {
  return (
    boundary.tool !== undefined ||
    boundary.actionType !== undefined ||
    boundary.environment !== undefined ||
    boundary.dataSensitivity !== undefined ||
    boundary.targetIncludes !== undefined ||
    boundary.externalFacing !== undefined ||
    boundary.reversible !== undefined
  );
}

function policyToolToCompanyTool(tool: { tool: string; allowed: boolean; requiresApproval?: boolean; maxDataSensitivity?: DataSensitivity; externalFacingAllowed?: boolean }): CompanyTool {
  return {
    tool: tool.tool,
    allowed: tool.allowed,
    ...(tool.requiresApproval !== undefined ? { requiresApproval: tool.requiresApproval } : {}),
    ...(tool.externalFacingAllowed === false ? { externalFacing: false } : {}),
    ...(tool.maxDataSensitivity !== undefined ? { maxDataSensitivity: tool.maxDataSensitivity } : {})
  };
}

function findHighestSeverity(gaps: AlignmentGap[]): AlignmentGapSeverity | undefined {
  return gaps.reduce<AlignmentGapSeverity | undefined>((highest, gap) => {
    if (highest === undefined || severityRank[gap.severity] > severityRank[highest]) {
      return gap.severity;
    }

    return highest;
  }, undefined);
}

function isExternalSharingTool(tool: CompanyTool): boolean {
  const text = searchable([tool.tool, tool.label, tool.notes]);

  return (
    text.includes("email.send") ||
    text.includes("file.export") ||
    text.includes("external") ||
    text.includes("api")
  );
}

function canTouchSensitivity(tool: CompanyTool, sensitivity: DataSensitivity): boolean {
  return tool.maxDataSensitivity === undefined || compareSensitivity(tool.maxDataSensitivity, sensitivity) >= 0;
}

function compareSensitivity(left: DataSensitivity, right: DataSensitivity): number {
  const order: Record<DataSensitivity, number> = {
    low: 0,
    medium: 1,
    high: 2
  };

  return order[left] - order[right];
}

function isProductionLike(environment: CompanyEnvironment): boolean {
  return environment.productionLike === true || environment.id === "production";
}

function textMatchesToolOrBoundary(
  text: string,
  tool: CompanyTool,
  boundaries: CompanyDecisionBoundary[]
): boolean {
  const normalizedText = normalize(text);
  const toolText = searchable([tool.tool, tool.label, tool.notes]);
  const boundaryText = searchable(
    boundaries.flatMap((boundary) => [boundary.id, boundary.label, boundary.targetIncludes, boundary.description])
  );

  return toolText.includes(normalizedText) || boundaryText.includes(normalizedText);
}

function appearsHighAuthority(role: AuthorityRole): boolean {
  const text = searchable([role.id, role.label, role.description, JSON.stringify(role.metadata ?? {})]);

  return (
    text.includes("admin") ||
    text.includes("owner") ||
    text.includes("director") ||
    text.includes("security") ||
    text.includes("release") ||
    text.includes("compliance")
  );
}

function isScopeBroad(scope: AuthorityScope): boolean {
  return (
    scope.tool === undefined &&
    scope.actionType === undefined &&
    scope.environment === undefined &&
    scope.dataSensitivity === undefined &&
    scope.maxDataSensitivity === undefined &&
    scope.externalFacing === undefined &&
    scope.reversible === undefined &&
    scope.targetIncludes === undefined
  );
}

function searchable(parts: Array<string | undefined>): string {
  return parts.filter(isString).map(normalize).join(" ");
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[-\s]+/g, "_");
}

function includesNormalized(haystack: string, needle: string): boolean {
  return normalize(haystack).includes(normalize(needle));
}

function stableIdPart(value: string): string {
  return normalize(value).replace(/[^a-z0-9_]/g, "_");
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}
