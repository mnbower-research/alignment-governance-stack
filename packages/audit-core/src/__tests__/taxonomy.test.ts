import { describe, expect, it } from "vitest";
import { findProhibitedAccusatoryLanguage, THEATER_SIGNAL_TAXONOMY } from "../index.js";

describe("theater signal taxonomy", () => {
  it("uses unique taxonomy IDs", () => {
    const ids = THEATER_SIGNAL_TAXONOMY.map((entry) => entry.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses TG-### IDs", () => {
    expect(THEATER_SIGNAL_TAXONOMY.every((entry) => /^TG-\d{3}$/.test(entry.id))).toBe(true);
  });

  it("includes audit questions and recommended remediations for every entry", () => {
    expect(THEATER_SIGNAL_TAXONOMY.every((entry) => entry.defaultAuditQuestions.length > 0)).toBe(true);
    expect(THEATER_SIGNAL_TAXONOMY.every((entry) => entry.defaultRemediation.length > 0)).toBe(true);
    expect(THEATER_SIGNAL_TAXONOMY.every((entry) => entry.recommendedRemediations.length > 0)).toBe(true);
  });

  it("maps every theater signal to a remediation control surface", () => {
    expect(THEATER_SIGNAL_TAXONOMY.every((entry) => entry.mapsToControl !== undefined)).toBe(true);
  });

  it("does not use prohibited accusatory wording", () => {
    const issues = findProhibitedAccusatoryLanguage(THEATER_SIGNAL_TAXONOMY);

    expect(issues).toEqual([]);
  });
});
