import { describe, expect, it } from "vitest";
import {
  analyzeBabelVelocity,
  calculateGovernanceAbsorptionMetrics,
  renderBabelVelocityReportMarkdown,
  summarizeBabelVelocity,
  validateBabelVelocityInput
} from "../index.js";
import type {
  BabelVelocityInput,
  BabelVelocityReport,
  TemporalBabelRiskWindow
} from "../velocityTypes.js";

describe("babel velocity", () => {
  it("does not crash on minimal valid input", () => {
    const input = withGeneratedAt({
      windows: [emptyWindow("w1", "2026-05-01T00:00:00.000Z", "2026-05-02T00:00:00.000Z")]
    });

    const validation = validateBabelVelocityInput(input);
    const report = analyzeBabelVelocity(input);

    expect(validation.valid).toBe(true);
    expect(report.windows).toHaveLength(1);
    expect(report.absorptionStatus).toBe("keeping_pace");
  });

  it("single window reports not_enough_data for trends but calculates metrics", () => {
    const report = analyzeBabelVelocity(withGeneratedAt({ windows: [healthyWindow("w1")] }));

    expect(report.summary.closureTrend).toBe("not_enough_data");
    expect(report.windows[0]?.riskWeightedDecisionLoad).toBeGreaterThan(0);
    expect(report.windows[0]?.qualityWeightedClosureLoad).toBeGreaterThan(0);
  });

  it("healthy two-window input keeps pace with low risk", () => {
    const report = analyzeBabelVelocity(
      withGeneratedAt({
        windows: [healthyWindow("w1"), healthyWindow("w2", "2026-05-02T00:00:00.000Z")]
      })
    );

    expect(report.absorptionStatus).toBe("keeping_pace");
    expect(report.overallVelocityRisk).toBe("low");
  });

  it("declining closure ratio produces closure_ratio_declining", () => {
    const report = analyzeBabelVelocity(withGeneratedAt(decliningInput()));

    expect(categories(report)).toContain("closure_ratio_declining");
  });

  it("decision rate exceeding closure rate produces decision_rate_exceeds_closure_rate", () => {
    const report = analyzeBabelVelocity(withGeneratedAt({ windows: [overloadedWindow("w1")] }));

    expect(categories(report)).toContain("decision_rate_exceeds_closure_rate");
  });

  it("raw approvals increasing while quality closure declines is flagged", () => {
    const report = analyzeBabelVelocity(withGeneratedAt(locallyValidGloballyDrowningInput()));

    expect(categories(report)).toContain("raw_approvals_mask_meaningful_closure_decline");
  });

  it("formally closed weak approvals with declining ratio are globally drowning", () => {
    const report = analyzeBabelVelocity(withGeneratedAt(locallyValidGloballyDrowningInput()));

    expect(categories(report)).toContain("locally_valid_globally_drowning");
  });

  it("weights high-consequence low-volume decisions above low-consequence high-volume decisions when closure is weak", () => {
    const lowVolumeHighConsequence = calculateGovernanceAbsorptionMetrics({
      ...emptyWindow("critical", "2026-05-01T00:00:00.000Z", "2026-05-02T00:00:00.000Z"),
      decisionEvents: [
        decision("critical-1", "2026-05-01T01:00:00.000Z", "critical"),
        decision("critical-2", "2026-05-01T02:00:00.000Z", "critical")
      ],
      closureEvents: [rubberStampClosure("closure-critical", "2026-05-01T03:00:00.000Z", ["critical-1"])]
    });
    const highVolumeLowConsequence = calculateGovernanceAbsorptionMetrics({
      ...emptyWindow("low", "2026-05-01T00:00:00.000Z", "2026-05-02T00:00:00.000Z"),
      decisionEvents: Array.from({ length: 8 }, (_, index) =>
        decision(`low-${index}`, `2026-05-01T0${index}:00:00.000Z`, "low")
      ),
      closureEvents: [rubberStampClosure("closure-low", "2026-05-01T09:00:00.000Z", ["low-1"])]
    });

    expect(lowVolumeHighConsequence.riskWeightedDecisionLoad).toBeGreaterThan(
      highVolumeLowConsequence.riskWeightedDecisionLoad
    );
    expect(lowVolumeHighConsequence.governanceClosureRatio).toBeLessThan(
      highVolumeLowConsequence.governanceClosureRatio
    );
  });

  it("increasing review lag produces review_lag_increasing", () => {
    const first = {
      ...healthyWindow("w1"),
      closureEvents: [meaningfulClosure("c1", "2026-05-01T02:00:00.000Z", ["d1"])]
    };
    const second = {
      ...healthyWindow("w2", "2026-05-02T00:00:00.000Z"),
      decisionEvents: [decision("d2", "2026-05-02T01:00:00.000Z", "medium")],
      closureEvents: [meaningfulClosure("c2", "2026-05-03T01:00:00.000Z", ["d2"])]
    };
    const report = analyzeBabelVelocity(withGeneratedAt({ windows: [first, second] }));

    expect(categories(report)).toContain("review_lag_increasing");
  });

  it("increasing open or stale remediation load produces remediation_backlog_growing", () => {
    const first = healthyWindow("w1");
    const second = {
      ...healthyWindow("w2", "2026-05-02T00:00:00.000Z"),
      remediationEvents: [
        {
          id: "rem-1",
          openedAt: "2026-05-02T02:00:00.000Z",
          severity: "high" as const,
          status: "open" as const
        },
        {
          id: "rem-2",
          openedAt: "2026-05-02T03:00:00.000Z",
          severity: "critical" as const,
          status: "stale" as const
        }
      ]
    };
    const report = analyzeBabelVelocity(withGeneratedAt({ windows: [first, second] }));

    expect(categories(report)).toContain("remediation_backlog_growing");
  });

  it("authority coverage decline produces authority_coverage_lagging_scope", () => {
    const report = analyzeBabelVelocity(
      withGeneratedAt({
        windows: [
          {
            ...healthyWindow("w1"),
            authorityCoverageEvents: [{ id: "auth-1", timestamp: "2026-05-01T04:00:00.000Z", coverage: "covered" }]
          },
          {
            ...healthyWindow("w2", "2026-05-02T00:00:00.000Z"),
            authorityCoverageEvents: [
              {
                id: "auth-2",
                timestamp: "2026-05-02T04:00:00.000Z",
                coverage: "weak",
                ambiguousAuthority: true
              }
            ]
          }
        ]
      })
    );

    expect(categories(report)).toContain("authority_coverage_lagging_scope");
  });

  it("proof completeness decline produces proof_completeness_declining", () => {
    const report = analyzeBabelVelocity(
      withGeneratedAt({
        windows: [
          {
            ...healthyWindow("w1"),
            proofEvents: [{ id: "proof-1", timestamp: "2026-05-01T04:00:00.000Z", completeness: "complete" }]
          },
          {
            ...healthyWindow("w2", "2026-05-02T00:00:00.000Z"),
            proofEvents: [{ id: "proof-2", timestamp: "2026-05-02T04:00:00.000Z", completeness: "weak" }]
          }
        ]
      })
    );

    expect(categories(report)).toContain("proof_completeness_declining");
  });

  it("capacity flat while decision load rises produces capacity_ceiling_not_expanding", () => {
    const report = analyzeBabelVelocity(withGeneratedAt(decliningInput()));

    expect(categories(report)).toContain("capacity_ceiling_not_expanding");
  });

  it("renders markdown with closure ratio, capacity utilization, findings, recommendations, and limitations", () => {
    const report = analyzeBabelVelocity(withGeneratedAt(decliningInput()));
    const markdown = renderBabelVelocityReportMarkdown(report);

    expect(markdown).toContain("# Governance Absorption Capacity / Babel Velocity Report");
    expect(markdown).toContain("Closure ratio:");
    expect(markdown).toContain("Capacity utilization:");
    expect(markdown).toContain("## Findings");
    expect(markdown).toContain("## Recommended Remediation");
    expect(markdown).toContain("## Limitations");
  });

  it("is deterministic for fixed input when generatedAt is controlled", () => {
    const input = withGeneratedAt(decliningInput());
    const first = analyzeBabelVelocity(input);
    const second = analyzeBabelVelocity(input);

    expect(stripGeneratedAt(first)).toEqual(stripGeneratedAt(second));
    expect(first.generatedAt).toBe("2026-05-26T12:00:00.000Z");
    expect(summarizeBabelVelocity(first)).toContain("AGS Babel Velocity Report");
  });
});

function categories(report: BabelVelocityReport): string[] {
  return report.findings.map((finding) => finding.category);
}

function withGeneratedAt(input: BabelVelocityInput): BabelVelocityInput {
  return {
    ...input,
    metadata: {
      ...input.metadata,
      generatedAt: "2026-05-26T12:00:00.000Z"
    }
  };
}

function stripGeneratedAt(report: BabelVelocityReport): Omit<BabelVelocityReport, "generatedAt"> {
  const { generatedAt: _generatedAt, ...rest } = report;
  return rest;
}

function emptyWindow(id: string, from: string, to: string): TemporalBabelRiskWindow {
  return {
    id,
    from,
    to,
    decisionEvents: [],
    closureEvents: []
  };
}

function healthyWindow(id: string, from = "2026-05-01T00:00:00.000Z"): TemporalBabelRiskWindow {
  const day = from.slice(0, 10);
  return {
    id,
    from,
    to: `${day}T08:00:00.000Z`,
    decisionEvents: [
      decision("d1", `${day}T01:00:00.000Z`, "low"),
      decision("d2", `${day}T02:00:00.000Z`, "medium")
    ],
    closureEvents: [
      meaningfulClosure("c1", `${day}T02:00:00.000Z`, ["d1"]),
      meaningfulClosure("c2", `${day}T03:00:00.000Z`, ["d2"]),
      meaningfulClosure("c3", `${day}T04:00:00.000Z`, ["d2"])
    ],
    capacitySignals: [
      { id: `cap-${id}`, kind: "reviewer_bandwidth", capacityLevel: "strong", value: 0.5 }
    ],
    proofEvents: [
      { id: `proof-${id}`, timestamp: `${day}T04:00:00.000Z`, completeness: "complete" }
    ],
    authorityCoverageEvents: [
      { id: `auth-${id}`, timestamp: `${day}T04:00:00.000Z`, coverage: "covered" }
    ]
  };
}

function overloadedWindow(id: string): TemporalBabelRiskWindow {
  return {
    ...emptyWindow(id, "2026-05-01T00:00:00.000Z", "2026-05-02T00:00:00.000Z"),
    decisionEvents: [
      decision("d1", "2026-05-01T01:00:00.000Z", "critical"),
      decision("d2", "2026-05-01T02:00:00.000Z", "high")
    ],
    closureEvents: [rubberStampClosure("c1", "2026-05-01T03:00:00.000Z", ["d1"])]
  };
}

function decliningInput(): BabelVelocityInput {
  return {
    windows: [
      healthyWindow("w1"),
      {
        ...healthyWindow("w2", "2026-05-02T00:00:00.000Z"),
        decisionEvents: [
          decision("d3", "2026-05-02T01:00:00.000Z", "high"),
          decision("d4", "2026-05-02T02:00:00.000Z", "critical"),
          decision("d5", "2026-05-02T03:00:00.000Z", "high")
        ],
        closureEvents: [meaningfulClosure("c4", "2026-05-02T04:00:00.000Z", ["d3"])],
        capacitySignals: [
          { id: "cap-w2", kind: "reviewer_bandwidth", capacityLevel: "partial", value: 0.5 }
        ]
      }
    ]
  };
}

function locallyValidGloballyDrowningInput(): BabelVelocityInput {
  return {
    windows: [
      healthyWindow("w1"),
      {
        ...emptyWindow("w2", "2026-05-02T00:00:00.000Z", "2026-05-03T00:00:00.000Z"),
        decisionEvents: [
          decision("d3", "2026-05-02T01:00:00.000Z", "high"),
          decision("d4", "2026-05-02T02:00:00.000Z", "high"),
          decision("d5", "2026-05-02T03:00:00.000Z", "critical")
        ],
        closureEvents: [
          rubberStampClosure("c4", "2026-05-02T04:00:00.000Z", ["d3"]),
          rubberStampClosure("c5", "2026-05-02T05:00:00.000Z", ["d4"]),
          rubberStampClosure("c6", "2026-05-02T06:00:00.000Z", ["d5"]),
          {
            ...rubberStampClosure("c7", "2026-05-02T07:00:00.000Z", ["d5"]),
            participationQuality: "weak"
          }
        ]
      }
    ]
  };
}

function decision(
  id: string,
  timestamp: string,
  consequenceLevel: "low" | "medium" | "high" | "critical"
) {
  return {
    id,
    timestamp,
    kind: "runtime_execution" as const,
    consequenceLevel,
    evidenceRefs: [`evidence-${id}`]
  };
}

function meaningfulClosure(id: string, timestamp: string, relatedDecisionIds: string[]) {
  return {
    id,
    timestamp,
    kind: "human_review" as const,
    participationQuality: "meaningful" as const,
    closureStatus: "closed" as const,
    relatedDecisionIds,
    authorityValid: true,
    beforeCommitment: true,
    refusalPowerDemonstrated: true,
    contextSufficient: true,
    scopeMatched: true,
    evidenceRefs: [`evidence-${id}`]
  };
}

function rubberStampClosure(id: string, timestamp: string, relatedDecisionIds: string[]) {
  return {
    id,
    timestamp,
    kind: "approval" as const,
    participationQuality: "rubber_stamp" as const,
    closureStatus: "closed" as const,
    relatedDecisionIds,
    authorityValid: true,
    beforeCommitment: false,
    refusalPowerDemonstrated: false,
    contextSufficient: false,
    scopeMatched: true,
    evidenceRefs: [`evidence-${id}`]
  };
}
