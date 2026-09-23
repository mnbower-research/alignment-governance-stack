import type { ContinuityStatus } from "../types/continuity";
import type { EvidenceGapFinding } from "./evidenceProjection";

export function operatorStatusLabel(status: ContinuityStatus | string): string {
  const normalized = status.toLowerCase();

  if (normalized === "not demonstrated" || normalized === "not-demonstrated") return "Not verified";
  if (normalized === "missing") return "Required control missing";
  if (normalized === "partial" || normalized === "degraded") return "Needs attention";
  if (normalized === "connected") return "Connected";
  if (normalized === "enforced") return "Active control";
  if (normalized === "evidenced") return "Evidence available";
  if (normalized === "tested") return "Tested";
  if (normalized === "red-teamed") return "Adversarially tested";
  if (normalized === "production-validated") return "Production validated";
  if (normalized === "mapped" || normalized === "declared" || normalized === "observed") return "Not verified";

  return status;
}

export function operatorFindingCategory(finding: EvidenceGapFinding): string {
  if (finding.status === "Missing") return "Required control missing";
  if (finding.category === "Parser Diagnostic") return "Parser diagnostic";
  if (finding.category === "Import Diagnostic") return "Import warning";
  if (finding.status === "Not Demonstrated") return "Not verified";
  if (finding.category === "Governed Chain") return "Proof incomplete";
  if (finding.status === "Diagnostic") return "Needs review";

  return "Needs review";
}

export function affectedLayerLabel(layerIds: string[], fallback = "Active workflow"): string {
  if (layerIds.length === 0) return fallback;
  return layerIds.map((layerId) => layerId.replace("layer-", "Layer ")).join(", ");
}
