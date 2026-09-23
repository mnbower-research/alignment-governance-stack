# AI Media Agency Phase 1 Examples

These examples model the first AGS-governed AI media agency surface.

Phase 1 is simulation-only:

- no autonomous spending
- no network execution
- no public posting
- no external direct messages
- no payment or social-platform credentials
- no operational-agent policy mutation

The JSON policy and authority examples are draft review artifacts. The matching TypeScript fixtures live in `packages/ai-media-agency-adapter/src/phase1Governance.ts`.

Important limitation: budget, currency, platform, property, campaign, content, audience, and experiment-window values are preserved in proposal metadata in Phase 1, but current Runtime Binding does not hash or compare metadata. These examples are not sufficient for live spending or public posting.
