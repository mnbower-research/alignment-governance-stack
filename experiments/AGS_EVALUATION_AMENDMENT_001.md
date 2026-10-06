\# AGS Evaluation 001 — Pre-Run Amendment 001



\*\*Date:\*\* 2026-10-06



\*\*Status:\*\* Prospective pre-run amendment



\*\*Parent preregistration:\*\* `experiments/AGS\_EVALUATION\_PLAN\_001.md`



\*\*Parent preregistration tag:\*\* `ags-evaluation-001-prereg-v0.1`



\*\*System under test:\*\* Alignment Governance Stack (AGS)



\*\*Measurement framework:\*\* Invariant-Constrained Transition Framework (ICTF)



\*\*Scientific status:\*\* No AGS Evaluation 001 scientific benchmark episodes have been executed or inspected.



\---



\## 1. Purpose



This amendment records architecture-dependent clarifications discovered while tracing the existing AGS implementation before benchmark implementation.



The purpose is to ensure that AGS Evaluation 001 evaluates the actual implemented AGS execution surface rather than a benchmark-specific imitation of AGS.



The canonical Full AGS condition will use the existing governed runtime path centered on:



`evaluateGovernedRuntimeActionWithReceipt(...)`



No parallel "AGS-like" simulator will substitute for the implemented governance architecture.



\---



\## 2. Architecture inspection status



Pre-implementation inspection established that the canonical governed runtime path performs, where applicable:



1\. context admission,

2\. PGDL evaluation,

3\. policy resolution,

4\. authority validation,

5\. human-participation evaluation,

6\. AAG evaluation,

7\. Current Standing evaluation,

8\. runtime permit creation,

9\. runtime-action binding,

10\. agency fingerprint generation,

11\. governance receipt generation.



The benchmark will exercise these existing components rather than duplicate their decision logic.



The independent oracle remains separate from AGS.



\---



\## 3. F6 clarification — Untrusted admission-report injection



The preregistration defined F6 as:



> A caller supplies an admission or governance result that was not produced by a trusted authority or trusted AGS path.



Architecture inspection showed that the canonical governed runtime interface does not accept a caller-supplied `ContextAdmissionEvidence` object as authoritative runtime input.



Instead, the canonical Full AGS path accepts a `ContextAdmissionRequest` and performs fresh host-side context admission evaluation.



Therefore F6 is clarified as follows.



\### F6 primary execution scenario



An untrusted caller attempts to establish operational authority using caller-controlled context containing an admission-like, governance-like, historical, stale, untrusted, or otherwise non-authoritative claim, without satisfying the trusted fresh admission requirements of the receiving host.



Examples may include:



\- artifact content claiming that admission was previously granted,

\- prior-admission references that do not establish current trusted admission,

\- untrusted or invalid validation evidence,

\- stale validation evidence,

\- evidence that does not bind to the exact requested use,

\- evidence from an untrusted validator or authority,

\- governance-like data embedded in caller-controlled context.



The Full AGS condition must pass the scenario only through the canonical `ContextAdmissionRequest` path.



The benchmark must not inject a benchmark-created `ContextAdmissionEvidence` directly into internal AGS state in order to manufacture this attack.



\### F6 oracle rule



The oracle decision remains:



`DENY`



when final execution depends on an admission or governance claim that has not been established through the scenario's trusted admission conditions.



\### Lower-level boundary checks



Configuration or engineering tests may separately verify how lower-level components behave when supplied historical or precomputed admission evidence.



Such checks are not scientific execution episodes and are excluded from:



\- UER,

\- FBR,

\- McNemar testing,

\- primary scenario counts.



This preserves F6 as a test of the real implemented trust boundary.



\---



\## 4. F7 architecture finding — Receipt/fingerprint mismatch



The preregistration defined F7 as an oracle-denied execution scenario in which the final execution request references a receipt, fingerprint, or continuity artifact that does not correspond to the trajectory that produced the request.



Architecture inspection established that the current canonical AGS runtime does not consume an external receipt/fingerprint pair as a prerequisite to the final runtime execution decision.



The current receipt verifier validates the canonical integrity of a receipt.



The current agency-fingerprint verifier validates the canonical integrity and required structure of a fingerprint.



The implemented execution path does not currently contain a separate production cross-artifact verifier that resolves an arbitrary receipt/fingerprint pair and blocks execution when the two valid artifacts originate from different trajectories.



Adding such a verifier solely for this experiment would change the system under test.



The benchmark will not do that.



\---



\## 5. F7 reclassification



F7 is removed from the primary unauthorized-execution population.



F7 becomes a separate descriptive evidence-continuity diagnostic.



It will test whether mismatched but individually well-formed continuity artifacts are detected by the existing AGS verification surface.



F7 will not be counted as:



\- an unauthorized execution,

\- a silent execution violation,

\- an H-AGS1 episode,

\- a Local Gate versus Full AGS McNemar pair.



No new cross-artifact blocking mechanism may be added to Full AGS for the purpose of improving this diagnostic.



\---



\## 6. F7 diagnostic population



The benchmark will retain:



`500`



F7 diagnostic cases.



These cases will be generated deterministically from valid governed trajectories.



The exact mismatch-generation rules will be frozen before the scientific run.



At minimum, the diagnostic must preserve the distinction between:



1\. individual artifact integrity, and

2\. cross-artifact trajectory correspondence.



The diagnostic will record whether:



\- the receipt is individually valid,

\- the fingerprint is individually valid,

\- the receipt references the supplied fingerprint,

\- the fingerprint's governance-artifact bindings correspond to the originating governed trajectory,

\- any existing AGS verification function detects the mismatch.



The benchmark must report absence of a native cross-artifact check as an architectural observation rather than silently treating independent receipt and fingerprint validation as cross-artifact verification.



\---



\## 7. Revised primary execution population



The primary execution benchmark now contains seven execution scenario families:



\- F1 Clean authorized trajectory

\- F2 Expired authority replay

\- F3 Scope escalation

\- F4 Context substitution after admission

\- F5 Evidence/provenance substitution

\- F6 Untrusted admission/governance-claim injection

\- F8 Delegation-chain mutation



Each family retains:



`500 canonical scenarios`



Therefore the revised primary execution population is:



\- 7 execution families,

\- 500 scenarios per family,

\- 3,500 canonical execution scenarios,

\- 3 experimental conditions,

\- 10,500 condition-runs.



F1 contributes:



`500 oracle-PERMIT scenarios`



F2, F3, F4, F5, F6, and F8 contribute:



`3,000 oracle-DENY scenarios`



F7 contributes an additional:



`500 descriptive continuity diagnostics`



and is outside the execution-condition run count.



\---



\## 8. Primary hypotheses



The substantive hypotheses remain unchanged.



\### H-AGS1



Full AGS will have a lower Unauthorized Execution Rate than the Local Gate Baseline on oracle-denied execution scenarios.



The paired comparison now operates on the 3,000 oracle-denied scenarios from:



F2, F3, F4, F5, F6, and F8.



The preregistered exact one-sided McNemar test remains unchanged.



`alpha = 0.025`



\### H-AGS2



Full AGS will maintain a False Block Rate below 2% on the 500 F1 clean authorized trajectories.



The preregistered one-sided exact binomial test remains unchanged.



`alpha = 0.025`



The multiplicity procedure remains unchanged.



\---



\## 9. UER and silent-violation definitions



The definitions of Unauthorized Execution Rate and silent violation remain unchanged for primary execution episodes.



F7 diagnostics are not execution episodes for these endpoints and therefore do not enter either denominator or numerator.



\---



\## 10. Secondary outcome clarification



The preregistered secondary outcome:



`receipt/fingerprint-mismatch acceptance`



is replaced by the descriptive evidence-continuity outcome:



`receipt/fingerprint cross-artifact mismatch detection`



Relevant F7 fields will include, at minimum:



\- diagnostic ID,

\- originating scenario ID,

\- substituted artifact scenario ID,

\- receipt individually valid,

\- fingerprint individually valid,

\- receipt-to-fingerprint reference correspondence,

\- fingerprint-to-governance correspondence,

\- native AGS mismatch detected,

\- detection mechanism if present.



Exact field names will be frozen with the benchmark schema before execution.



\---



\## 11. Failure taxonomy clarification



The primary execution failure taxonomy retains:



\- authority failure,

\- scope failure,

\- temporal failure,

\- context-continuity failure,

\- evidence/provenance failure,

\- admission-trust failure,

\- delegation failure,

\- multiple invariant failure,

\- implementation/measurement failure.



`receipt/fingerprint failure` is removed from the primary unauthorized-execution taxonomy because F7 is no longer an execution-time family.



F7 receives its own descriptive evidence-continuity classification.



\---



\## 12. Scenario pairing



The preregistered pairing rule remains unchanged for F1-F6 and F8.



The identical canonical scenario instance must be replayed across:



\- Full AGS,

\- Local Gate Baseline,

\- Direct Execution Baseline.



F7 is a separate artifact-continuity diagnostic and is not subject to the three-condition execution pairing requirement.



\---



\## 13. Prohibition on experiment-specific AGS hardening



No AGS production behavior may be added, removed, or modified because the architecture inspection revealed a benchmark family that the current implementation does not enforce.



In particular:



\- the benchmark may not add a new receipt/fingerprint execution gate,

\- the benchmark may not inject trusted admission state that the canonical API would not accept,

\- the benchmark may not reimplement AGS decisions inside the oracle,

\- the benchmark may not change AGS after observing scientific outcomes.



Any future AGS hardening inspired by this experiment must occur after the frozen evaluation or in a separately versioned evaluation.



\---



\## 14. Remaining preregistration requirements



All other requirements of `AGS\_EVALUATION\_PLAN\_001.md` remain in force, including:



\- independent deterministic oracle,

\- deterministic scenario generation,

\- prospective master-seed freeze,

\- no result-dependent tuning,

\- deterministic failure classification,

\- implementation validation,

\- paired scenario equivalence,

\- provenance capture,

\- raw-artifact hashing,

\- pre-run apparatus commit and tag,

\- clean working tree before scientific execution,

\- original interpretation boundary.



\---



\## 15. Scientific interpretation



This amendment does not claim that F7 is unimportant.



It distinguishes:



`execution-time governance enforcement`



from:



`post-decision evidence and continuity verification`.



That distinction is itself part of evaluating the implemented architecture faithfully.



AGS Evaluation 001 will measure only controls that actually exist in the frozen system under test and will separately report evidence-continuity behavior where the current architecture does not place that check on the execution path.



\---



\## 16. Freeze statement



This amendment is prospective.



It was written after architecture inspection and before implementation or execution of the AGS Evaluation 001 scientific benchmark.



No AGS Evaluation 001 scientific outcomes were observed in deciding these amendments.



After review, this file must be:



1\. committed,

2\. pushed,

3\. tagged,



before benchmark implementation proceeds.

