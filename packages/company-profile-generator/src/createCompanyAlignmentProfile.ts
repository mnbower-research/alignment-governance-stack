import type { CompanyAlignmentInput, CompanyAlignmentProfile } from "./types.js";
import { validateCompanyAlignmentInput } from "./validateCompanyAlignmentInput.js";

export function createCompanyAlignmentProfile(
  input: CompanyAlignmentInput
): CompanyAlignmentProfile {
  const validation = validateCompanyAlignmentInput(input);

  if (!validation.valid) {
    throw new Error(`Invalid company alignment input: ${validation.errors.join(" ")}`);
  }

  return {
    id: input.id,
    name: input.name,
    ...(input.organization !== undefined ? { organization: input.organization } : {}),
    version: "company.alignment.v0.3",
    ...(input.description !== undefined ? { description: input.description } : {}),
    values: [...(input.values ?? [])],
    roles: [...(input.roles ?? [])],
    tools: [...(input.tools ?? [])],
    dataClasses: [...(input.dataClasses ?? [])],
    environments: [...(input.environments ?? [])],
    decisionBoundaries: [...(input.decisionBoundaries ?? [])],
    generatedPolicyProfileId: `${input.id}.policy`,
    ...(input.defaultMode !== undefined ? { defaultMode: input.defaultMode } : {}),
    ...(input.metadata !== undefined ? { metadata: { ...input.metadata } } : {})
  };
}
