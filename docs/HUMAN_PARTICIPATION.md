# Human Participation Quality

Human Participation Quality is the AGS layer that asks:

> Did the right human meaningfully participate, or did they merely rubber-stamp the system?

Human oversight is not meaningful just because a human clicked approve. Meaningful participation requires context, time, contestability, reason-giving, and valid authority.

## v0.6.0 Foundation

`@alignment-governance-stack/human-participation` provides:

- `HumanParticipationInput`
- `HumanParticipationPolicy`
- `HumanParticipationSignal`
- `HumanParticipationResult`
- `defaultParticipationPolicy`
- `validateParticipationInput`
- `evaluateParticipationQuality`

The evaluator is deterministic. It checks whether participation was required, whether a human response exists, whether authority was valid, whether risk context and objections were presented, whether enough review time was spent, and whether the response includes reason-giving or active engagement.

It can return:

- `meaningful_participation`
- `insufficient_participation`
- `likely_rubber_stamp`
- `participation_not_required`
- `participation_input_invalid`

## Boundaries

Human Participation Quality does not identify a person. It does not execute actions, store approvals, sign approvals, or decide policy. It does not replace Authority Map or AAG.

Authority Map answers who is allowed to approve. Human Participation Quality evaluates whether the participation evidence appears meaningful enough to rely on.

Hard boundaries still stop before participation quality matters. Approval and participation cannot override organization-defined "never automate" rules in v0.6.

## Future Work

Future versions can add dashboard review UX, approval workflows, signatures, durable approval logs, human participation analytics, and richer rubber-stamp detection.

