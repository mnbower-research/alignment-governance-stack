# Integration Adapters

Foundation package for connecting external workflow systems to the Alignment Governance Stack.

v0.9.0 starts with n8n adapter helpers:

- normalize workflow action payloads into AGS `AgentActionProposal` inputs
- run local AGS governance checks through `governance-core`
- map governance results into workflow-friendly JSON responses
- provide lightweight n8n template metadata

The package does not execute actions, host an API, write to disk, call the network, store state, or provide auth.
