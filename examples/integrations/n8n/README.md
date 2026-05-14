# n8n Integration Examples

These examples show how an n8n workflow can send proposed actions into AGS before any real action executes.

AGS v0.9.0 does not ship a hosted API or web server. In n8n, the current supported patterns are:

- use an Execute Command node to call the local AGS CLI with an input JSON file
- wrap AGS packages in your own internal service later, then call that service with an HTTP Request node

Do not place real-world action nodes before the AGS governance check. Branch on:

- `response.json.allowed`
- `response.json.nextStep`

Suggested branching:

- `proceed`: continue to the intended action
- `stop`: stop the workflow
- `request_approval`: route to human approval
- `request_revision`: route to proposal revision
- `escalate`: route to human escalation

## Files

- `ags-governance-webhook.workflow.json`: receives proposed action JSON and returns a governance response placeholder.
- `ags-before-http-request.workflow.json`: checks a proposed HTTP action before the real HTTP Request node.
- `inputs/safe-internal-report.json`: safe internal report proposal.
- `inputs/dangerous-delete.json`: dangerous production delete proposal.
- `inputs/runtime-substitution.json`: safe proposal with substituted runtime action.

## Local CLI Shape

The Execute Command node can call a command shaped like:

```bash
corepack pnpm --filter @alignment-governance-stack/cli ags govern path/to/input.json --json
```

n8n deployments vary in filesystem access and command permissions. Treat the workflow JSON as a starting template and wire paths according to your deployment.
