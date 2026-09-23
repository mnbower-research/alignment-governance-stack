# Governance Memory

Deterministic receipt-history analysis for the Alignment Governance Stack.

Governance Memory reads governance receipts over time, detects repeated patterns, and produces human-reviewable recommendations for Policy Profiles, Hard Boundaries, Authority Maps, Human Participation policies, Runtime Binding investigation, and eval expansion.

It does not silently mutate policy, execute actions, host a service, store state, call providers, or learn without oversight.

Core posture:

```text
A gate that never remembers cannot mature.
A gate that remembers without oversight can drift.
A true gate remembers under authority.
```

Stored history does not automatically become operational context. A receiving agent must evaluate provenance, permitted use and current authority through Context Admission. Recommendations remain subject to human review and do not mutate policy. See [Governed Information Inheritance](../../docs/GOVERNED_INFORMATION_INHERITANCE.md).
