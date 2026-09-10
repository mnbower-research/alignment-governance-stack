# AI Media Agency Adapter

Phase 1 adapter for a simulation-only AGS-governed AI media agency.

The adapter maps agency business proposals into canonical AGS `AgentActionProposal` inputs, calls `governance-core`, and returns agency-friendly next steps. It does not execute actions, call networks, store credentials, mutate policy, or treat metadata as runtime permission.

Phase 1 constraints:

- simulation-only
- no network execution
- no public posting
- no external direct messages
- no payment or social-platform credentials
- no autonomous spending
- every spend-like action requires CEO approval
- maximum simulated spend per action is USD 25

Budget, platform, property, campaign, content, audience, and experiment-window values are preserved in proposal metadata for review and receipts, but current AGS Runtime Binding does not hash or compare metadata. Live execution requires future canonical binding work.
