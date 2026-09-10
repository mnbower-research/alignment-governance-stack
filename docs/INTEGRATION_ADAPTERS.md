# Integration Adapters

Integration Adapters are edge helpers for connecting workflow tools to AGS.

They answer:

```text
How does a real workflow tool send proposed actions into AGS and receive a governance result back?
```

## What They Do

Adapters normalize external workflow payloads into AGS proposal inputs, then map AGS governance results back into workflow-friendly response objects.

In v0.9.0, the first adapter target is n8n.

The n8n adapter can:

- accept an n8n-shaped action payload
- normalize it into an `AgentActionProposal`
- include optional runtime action, policy profile, authority map, approval evidence, and human participation payloads
- call local `governance-core` through `createN8nWebhookResponse`
- return JSON with `allowed`, `decision`, `reason`, `receiptHash`, and `nextStep`

## What They Do Not Do

Adapters do not:

- execute real-world actions
- run network calls
- host an API or web server
- store approvals, receipts, or workflow state
- provide auth
- send telemetry
- call LLMs or provider APIs
- bypass PGDL, AAG, Runtime Binding, Receipts, Policy Profiles, Hard Boundaries, Authority Map, Human Participation, the Eval Suite, or the CLI

## n8n Foundation

n8n can receive proposed action payloads through a Webhook node. It can also use an HTTP Request node to call APIs.

AGS v0.9.0 does not ship a hosted API. Current supported integration paths are:

- call AGS locally through the Developer CLI
- import and call `@alignment-governance-stack/integration-adapters` from an internal wrapper
- later, call a hosted API wrapper that your deployment owns

Adapters should place execution-authoritative domain values in `AgentActionProposal.executionConstraints`; metadata is review context only. Only values represented as canonical bound execution constraints are protected as domain-specific execution-authoritative values by Runtime Binding. Ordinary metadata remains non-authoritative.

The adapter response is intentionally friendly to n8nâ€™s JSON pipeline:

```json
{
  "json": {
    "allowed": false,
    "decision": "execution_denied",
    "reason": "Runtime action did not match the issued permit.",
    "receiptHash": "...",
    "nextStep": "stop"
  }
}
```

Supported `nextStep` values:

- `proceed`
- `stop`
- `request_approval`
- `request_revision`
- `escalate`

## Examples

n8n examples live under:

```text
examples/integrations/n8n
```

They include:

- `ags-governance-webhook.workflow.json`
- `ags-before-http-request.workflow.json`
- `inputs/safe-internal-report.json`
- `inputs/dangerous-delete.json`
- `inputs/runtime-substitution.json`

The workflow JSON files are minimal templates. They show where to place AGS checks before real action nodes, but they do not assume a hosted AGS API exists.

## Future Adapters

Likely future adapters include:

- GitHub Actions
- Slack
- Gmail
- database tools
- generic HTTP proxy
- workflow-specific approval systems

