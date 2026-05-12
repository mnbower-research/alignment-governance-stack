import type { ReviewPacket } from "./types";

export function printReviewPacket(reviewPacket: ReviewPacket): void {
  console.log("Review Packet:");
  console.log(`Proposed action: ${reviewPacket.proposedAction}`);

  if (reviewPacket.scope) {
    console.log(`Scope: ${formatScope(reviewPacket.scope)}`);
  }

  if (reviewPacket.diffPreview) {
    console.log("Diff / Preview:");
    printDiffPreview(reviewPacket.diffPreview);
  }

  if (reviewPacket.rollbackPath) {
    console.log(
      `Rollback: ${reviewPacket.rollbackPath.description} available=${reviewPacket.rollbackPath.available}`,
    );
  }

  console.log(`Risk: ${reviewPacket.riskReason}`);
  console.log(`Reviewer question: ${reviewPacket.reviewerQuestion}`);

  if (reviewPacket.saferAlternative) {
    console.log(`Safer alternative: ${reviewPacket.saferAlternative}`);
  }
}

function formatScope(scope: NonNullable<ReviewPacket["scope"]>): string {
  const parts = [
    scope.target ? `target=${scope.target}` : undefined,
    scope.affectedSystems?.length
      ? `systems=${scope.affectedSystems.join(", ")}`
      : undefined,
    scope.affectedRecords?.length
      ? `records=${scope.affectedRecords.join(", ")}`
      : undefined,
    scope.externalEffect !== undefined
      ? `externalEffect=${scope.externalEffect}`
      : undefined,
    scope.dataSensitivity ? `dataSensitivity=${scope.dataSensitivity}` : undefined,
    scope.blastRadius ? `blastRadius=${scope.blastRadius}` : undefined,
  ].filter(Boolean);

  return parts.join("; ");
}

function printDiffPreview(
  diffPreview: NonNullable<ReviewPacket["diffPreview"]>,
): void {
  console.log(`Type: ${diffPreview.type}`);

  if (diffPreview.before !== undefined) {
    console.log(`Before: ${JSON.stringify(diffPreview.before, null, 2)}`);
  }

  if (diffPreview.after !== undefined) {
    console.log(`After: ${JSON.stringify(diffPreview.after, null, 2)}`);
  }

  if (diffPreview.preview) {
    console.log(diffPreview.preview);
  }
}
