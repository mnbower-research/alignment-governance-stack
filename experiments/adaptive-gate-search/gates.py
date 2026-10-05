from __future__ import annotations

from dataclasses import dataclass
import hashlib
import math

from environment import Proposal


@dataclass(frozen=True)
class GateDecision:
    admitted: bool
    score: float


class StructuredGate:
    """
    Operational gate with a smooth localized false-admission region.
    """

    def __init__(
        self,
        center_x: float = 0.72,
        center_y: float = 0.42,
        amplitude: float = 0.22,
        sigma: float = 0.075,
    ) -> None:
        self.center_x = center_x
        self.center_y = center_y
        self.amplitude = amplitude
        self.sigma = sigma

    def score(self, proposal: Proposal) -> float:
        base_margin = 1.0 - (proposal.x1 + proposal.x2)

        dx = proposal.x1 - self.center_x
        dy = proposal.x2 - self.center_y
        distance_sq = dx * dx + dy * dy

        bump = self.amplitude * math.exp(
            -distance_sq / (2.0 * self.sigma * self.sigma)
        )

        return base_margin + bump

    def evaluate(self, proposal: Proposal) -> GateDecision:
        score = self.score(proposal)
        return GateDecision(
            admitted=score >= 0.0,
            score=score,
        )


class UnstructuredGate:
    """
    Operational gate with scattered deterministic false-admission cells.
    """

    def __init__(
        self,
        grid_size: int = 256,
        invalid_cell_escape_rate: float = 0.05,
        seed: int = 20261004,
    ) -> None:
        if grid_size <= 0:
            raise ValueError("grid_size must be positive.")

        if not (0.0 <= invalid_cell_escape_rate <= 1.0):
            raise ValueError(
                "invalid_cell_escape_rate must lie in [0,1]."
            )

        self.grid_size = grid_size
        self.invalid_cell_escape_rate = invalid_cell_escape_rate
        self.seed = seed

    def _cell(self, proposal: Proposal) -> tuple[int, int]:
        ix = min(int(proposal.x1 * self.grid_size), self.grid_size - 1)
        iy = min(int(proposal.x2 * self.grid_size), self.grid_size - 1)
        return ix, iy

    def _cell_value(self, ix: int, iy: int) -> float:
        payload = f"{self.seed}:{ix}:{iy}".encode("utf-8")
        digest = hashlib.sha256(payload).digest()
        integer = int.from_bytes(digest[:8], "big")
        return integer / float(2**64)

    def evaluate(self, proposal: Proposal) -> GateDecision:
        base_margin = 1.0 - (proposal.x1 + proposal.x2)

        if base_margin >= 0.0:
            return GateDecision(
                admitted=True,
                score=base_margin,
            )

        ix, iy = self._cell(proposal)
        escape_cell = (
            self._cell_value(ix, iy)
            < self.invalid_cell_escape_rate
        )

        if escape_cell:
            return GateDecision(
                admitted=True,
                score=abs(base_margin),
            )

        return GateDecision(
            admitted=False,
            score=base_margin,
        )
