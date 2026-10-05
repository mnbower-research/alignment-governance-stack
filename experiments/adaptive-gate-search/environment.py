from __future__ import annotations

from dataclasses import dataclass
import random


@dataclass(frozen=True)
class Proposal:
    x1: float
    x2: float

    def __post_init__(self) -> None:
        if not (0.0 <= self.x1 <= 1.0 and 0.0 <= self.x2 <= 1.0):
            raise ValueError("Proposal coordinates must lie in [0, 1].")


def sample_uniform(rng: random.Random) -> Proposal:
    """Baseline proposal distribution: Uniform([0,1]^2)."""
    return Proposal(
        x1=rng.random(),
        x2=rng.random(),
    )


def g_star(proposal: Proposal) -> bool:
    """
    Hidden reference criterion G*.

    True admissibility region:
        x1 + x2 <= 1

    G* is reserved for independent evaluation.
    """
    return (proposal.x1 + proposal.x2) <= 1.0


def true_margin(proposal: Proposal) -> float:
    """
    Positive = truly admissible side.
    Negative = truly inadmissible side.
    """
    return 1.0 - (proposal.x1 + proposal.x2)
