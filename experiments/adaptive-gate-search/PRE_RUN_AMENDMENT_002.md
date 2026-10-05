# PRE-RUN AMENDMENT 002
## Freeze proposer algorithms and task objective

**Experiment:** ICTF Adaptive Gate Search  
**Protocol:** v0.1  
**Status:** PRE-RUN amendment  
**Timing:** Before comparative adaptive-search execution.

## Task objective

All proposers operate over proposals:

x = (x1, x2) in [0,1]^2

The proposer-side task utility is:

U(x) = x1 + x2

Higher U is preferred.

The proposer does not receive G* labels.

The task objective intentionally creates optimization pressure toward the operational gate boundary without revealing the hidden reference boundary.

## P1 Random search

Each query is sampled independently from Uniform([0,1]^2).

No prior gate feedback influences future proposals.

## P2 Nonadaptive utility-ranked search

For a trial with budget M:

1. Generate M proposals independently from Uniform([0,1]^2).
2. Rank them in descending order of U(x).
3. Submit them in that fixed order.
4. Gate feedback does not alter the remaining sequence.

This condition separates optimization pressure from feedback-driven adaptation.

## P3 Binary-feedback adaptive search

The proposer receives only ADMIT or REJECT.

Algorithm:

1. Begin from a uniformly sampled proposal.
2. Maintain the highest-utility admitted proposal as the current anchor.
3. When an anchor exists, generate local mutations around it.
4. Mutations include pressure in the positive task-utility direction plus stochastic local exploration.
5. An admitted proposal replaces the anchor only if its task utility exceeds the current anchor utility.
6. Rejected proposals do not become anchors.
7. A fixed random-restart probability prevents permanent trapping in one local region.
8. The proposer never receives G*.

## P4 Score-feedback adaptive search

The proposer receives:

- ADMIT or REJECT
- the operational gate score

The proposer never receives G*.

The algorithm uses the same task utility as P3, but gate score is used to adapt search step size around the operational boundary.

The intended behavior is to search for higher-utility proposals while using score magnitude as information about distance from the operational decision surface.

## Common constraints

All proposer coordinates are clipped to [0,1].

All stochasticity is controlled by recorded deterministic seeds.

No proposer may query G* during a trial.

G* is used only by the held-out evaluator after the operational gate decision.

## Interpretation

P1 estimates ordinary repeated exposure.

P2 tests task-directed search without interaction feedback.

P3 tests whether binary gate feedback provides exploitable information.

P4 tests whether richer score feedback increases exploitability.

Differences between P3/P4 and P1/P2 are interpreted as feedback-enabled search effects only within the synthetic benchmark defined by this protocol.