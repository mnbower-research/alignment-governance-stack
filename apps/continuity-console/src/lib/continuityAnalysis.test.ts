import { describe, expect, it } from "vitest";
import { sampleDeployment } from "../data/sampleDeployment";
import { analyzeContinuity } from "./continuityAnalysis";

describe("analyzeContinuity", () => {
  it("derives continuity metrics from typed deployment data", () => {
    const analysis = analyzeContinuity(sampleDeployment);

    expect(analysis.continuityPercentage).toBeGreaterThan(0);
    expect(analysis.continuityPercentage).toBeLessThan(100);
    expect(analysis.criticalGapCount).toBe(1);
    expect(analysis.missingLayers.map((layer) => layer.id)).toContain("layer-7");
    expect(analysis.weakEdges.some((edge) => edge.id === "edge-6-7")).toBe(true);
    expect(analysis.recommendedNextSteps).toContain("Add a Runtime Decision Adapter before permit issuance.");
  });
});
