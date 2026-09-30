# Editorial release wording correction

The baseline `ags-core-enterprise-baseline-1` (`e7c973f222689bab88eec072ab412fd7841271f9`) remains unchanged and reproduces the original false positive.

`toolMismatch` previously concatenated action type, target and serialized payload, then selected the first matching tool expectation. The deployment expectation matched the word `release` anywhere in that text. A title such as “Harbor release note” consequently required a deployment tool even for a structured editorial action.

The correction gives the deployment expectation a separate matching projection. For these exact existing action/tool contracts only:

- `publish_blog_post` with `blog.publish`
- `create_internal_content_draft` with `draft.create`

the word `release` in string-valued payload `title` and `body` fields does not establish deployment intent. These fields represent editorial content for these contracts. This is not a general exception for publishing tools or a list of benign natural-language phrases.

Action type, target and all other payload fields remain subject to the existing deployment check. `deploy` and `rollback` remain signals even in title/body. Unknown action/tool pairs and non-string content retain conservative matching. Other tool-expectation rules and detector ordering are unchanged. The original proposal and payload are never altered; the special projection is private to this detector, not an authorization or Runtime Binding hash projection.

An untriggered mismatch detector does not itself authorize execution. Approval, policy, other AAG checks and Runtime Binding remain required as before. Hosts must accurately describe the actual operation and must not use these editorial tool contracts for an executor that interprets article content as commands.

Compatibility: no public schema, export, decision enum, approval requirement or canonical hash changes. The intentional behavior change is removal of release-word-only deployment mismatches in those two contracts' content fields. Other editorial schemas, release words in targets, and unrelated overloaded words remain outside this correction. Genuine deployment/software-release/infrastructure-release action types with the wrong tool still request revision. The existing detector remains heuristic, not a general intent classifier.

Regression coverage includes editorial titles and bodies, public AAG integration, actual deployment/release/rollback and infrastructure configuration operations, correct deployment tools, wrong tools, commands and nested configuration fields, unknown/ambiguous action contexts, other tool-expectation rules, and payload immutability.

For the next Enterprise experiment, first review and commit this correction and record its exact SHA under a new tag such as `ags-core-enterprise-baseline-2`. Do not move the old baseline tag. Author a new Enterprise preregistration before obtaining results; this Core correction does not itself establish an Enterprise evaluation outcome.
