\# Alignment Governance Stack v1.14.0



\## Risk-Scaled Assurance and Independent Validation



v1.14.0 adds risk-scaled assurance to the Alignment Governance Stack while preserving the distinction between assurance and authority.



\### Core principle



The required strength of assurance must scale with consequence.



\### What changed



\- Added the `@alignment-governance-stack/assurance` package.

\- Added risk-scaled assurance requirements for host-designated actions.

\- Added validator role, authority-domain, freshness, and declared independence checks.

\- Added refusal-history preservation and explicit resolution handling.

\- Added mandatory-human assurance support.

\- Added assurance evidence to Continuity Console ingestion and display.

\- Added `ags assurance-evaluate`.

\- Integrated assurance into AAG and Governance Core.

\- Re-evaluated assurance during Runtime Binding at the execution boundary.

\- Bound assurance requirements into the runtime action hash.

\- Capped runtime permit validity by assurance validity.



\### Governance boundaries



Assurance does not create authority.



A satisfied assurance result cannot authorize an action by itself. The action must still pass PGDL, applicable policy and authority checks, AAG, and Runtime Binding.



Validator plurality is not treated as proof of real-world independence. AGS evaluates declared identities, roles, authority domains, and independence groups supplied by the trusted host.



Approval does not resolve a prior refusal. Material refusal history remains visible unless resolved under the applicable assurance policy.



\### Validation



The v1.14.0 implementation passed:



\- workspace build

\- workspace typecheck

\- 703 automated tests

\- targeted review of AAG assurance handling

\- runtime assurance expiry and revocation handling

\- refusal-preservation behavior

\- validator alias and independence-group handling

\- assurance-to-permit binding

\- runtime re-evaluation at the consequence boundary



\### Release status



This release extends the governed action path without adding a new architectural layer. Risk-Scaled Assurance supports AAG and Runtime Binding while remaining distinct from authority, context admissibility, execution evidence, and operator observability.

