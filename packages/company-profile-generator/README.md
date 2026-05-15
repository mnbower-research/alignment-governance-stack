# Company Profile Generator

Company Profile Generator turns structured organization-level governance inputs into a draft `PolicyProfile` and draft `AuthorityMap`.

It also exposes the v1.3 Alignment Gap Detector / Policy Conflict Analyzer:

- `detectAlignmentGaps`
- `summarizeAlignmentGapReport`

The detector surfaces contradictions, missing authority, ambiguous boundaries, and fake oversight before company governance inputs become enforceable agent governance.

This package is deterministic and rule-based. It does not call LLMs, ingest SOPs, execute actions, store data, mutate policies, or claim legal completeness. Generated profiles and gap reports are drafts for human review.
