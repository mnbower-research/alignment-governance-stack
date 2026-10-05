from __future__ import annotations

from dataclasses import dataclass
import random

from environment import Proposal, sample_uniform


def task_utility(proposal: Proposal) -> float:
    """Higher x1 + x2 is preferred."""
    return proposal.x1 + proposal.x2


def _clip(value: float) -> float:
    return min(1.0, max(0.0, value))


class RandomProposer:
    """P1: independent random search."""

    def __init__(self, rng: random.Random) -> None:
        self.rng = rng

    def next_proposal(self) -> Proposal:
        return sample_uniform(self.rng)

    def observe(
        self,
        proposal: Proposal,
        admitted: bool,
        score: float | None = None,
    ) -> None:
        pass


class NonAdaptiveUtilityRankedProposer:
    """P2: fixed utility-ranked batch with no feedback adaptation."""

    def __init__(self, rng: random.Random, budget: int) -> None:
        if budget <= 0:
            raise ValueError("budget must be positive")

        proposals = [
            sample_uniform(rng)
            for _ in range(budget)
        ]

        self._queue = sorted(
            proposals,
            key=task_utility,
            reverse=True,
        )

        self._index = 0

    def next_proposal(self) -> Proposal:
        if self._index >= len(self._queue):
            raise StopIteration("Proposal budget exhausted")

        proposal = self._queue[self._index]
        self._index += 1
        return proposal

    def observe(
        self,
        proposal: Proposal,
        admitted: bool,
        score: float | None = None,
    ) -> None:
        pass


@dataclass
class AdaptiveState:
    anchor: Proposal | None = None
    anchor_utility: float = float("-inf")
    last_score: float | None = None
    last_admitted: bool | None = None


class BinaryAdaptiveProposer:
    """P3: ADMIT/REJECT feedback adaptive search."""

    def __init__(
        self,
        rng: random.Random,
        restart_probability: float = 0.10,
        local_sigma: float = 0.06,
        utility_push: float = 0.02,
    ) -> None:
        self.rng = rng
        self.restart_probability = restart_probability
        self.local_sigma = local_sigma
        self.utility_push = utility_push
        self.state = AdaptiveState()

    def next_proposal(self) -> Proposal:
        if (
            self.state.anchor is None
            or self.rng.random() < self.restart_probability
        ):
            return sample_uniform(self.rng)

        anchor = self.state.anchor

        return Proposal(
            x1=_clip(
                anchor.x1
                + self.utility_push
                + self.rng.gauss(0.0, self.local_sigma)
            ),
            x2=_clip(
                anchor.x2
                + self.utility_push
                + self.rng.gauss(0.0, self.local_sigma)
            ),
        )

    def observe(
        self,
        proposal: Proposal,
        admitted: bool,
        score: float | None = None,
    ) -> None:
        self.state.last_admitted = admitted

        if not admitted:
            return

        utility = task_utility(proposal)

        if utility > self.state.anchor_utility:
            self.state.anchor = proposal
            self.state.anchor_utility = utility


class ScoreAdaptiveProposer:
    """P4: gate-score feedback adaptive search."""

    def __init__(
        self,
        rng: random.Random,
        restart_probability: float = 0.10,
        min_sigma: float = 0.01,
        max_sigma: float = 0.12,
        score_scale: float = 0.50,
        min_push: float = 0.005,
        max_push: float = 0.05,
    ) -> None:
        self.rng = rng
        self.restart_probability = restart_probability
        self.min_sigma = min_sigma
        self.max_sigma = max_sigma
        self.score_scale = score_scale
        self.min_push = min_push
        self.max_push = max_push
        self.state = AdaptiveState()

    def _adaptive_sigma(self) -> float:
        score = self.state.last_score

        if score is None:
            return self.max_sigma

        if score <= 0.0:
            return self.min_sigma

        value = self.min_sigma + self.score_scale * score

        return min(
            self.max_sigma,
            max(self.min_sigma, value),
        )

    def _adaptive_push(self) -> float:
        score = self.state.last_score

        if score is None or score <= 0.0:
            return self.min_push

        value = self.min_push + self.score_scale * score

        return min(
            self.max_push,
            max(self.min_push, value),
        )

    def next_proposal(self) -> Proposal:
        if (
            self.state.anchor is None
            or self.rng.random() < self.restart_probability
        ):
            return sample_uniform(self.rng)

        anchor = self.state.anchor
        sigma = self._adaptive_sigma()
        push = self._adaptive_push()

        return Proposal(
            x1=_clip(
                anchor.x1
                + push
                + self.rng.gauss(0.0, sigma)
            ),
            x2=_clip(
                anchor.x2
                + push
                + self.rng.gauss(0.0, sigma)
            ),
        )

    def observe(
        self,
        proposal: Proposal,
        admitted: bool,
        score: float | None = None,
    ) -> None:
        if score is None:
            raise ValueError(
                "ScoreAdaptiveProposer requires score feedback"
            )

        self.state.last_score = score
        self.state.last_admitted = admitted

        if not admitted:
            return

        utility = task_utility(proposal)

        if utility > self.state.anchor_utility:
            self.state.anchor = proposal
            self.state.anchor_utility = utility


def build_proposer(
    name: str,
    rng: random.Random,
    *,
    budget: int,
):
    normalized = name.strip().lower()

    if normalized == "random":
        return RandomProposer(rng)

    if normalized == "nonadaptive":
        return NonAdaptiveUtilityRankedProposer(
            rng,
            budget,
        )

    if normalized == "binary":
        return BinaryAdaptiveProposer(rng)

    if normalized == "score":
        return ScoreAdaptiveProposer(rng)

    raise ValueError(f"Unknown proposer: {name}")
