"""Small in-memory equivalence check. Never creates benchmark artifacts."""
from __future__ import annotations

import subprocess
import sys
import types
import unittest
from contextlib import contextmanager
from unittest.mock import patch

import trace_run_experiment as trace
from trace_analysis import validate_episode


FROZEN_COMMIT = "2d6e7915db3b067ba7ecca433bb578fb69395276"

VALIDATION_SEEDS = (
    17,
    20261006,
)

EPISODES_PER_SEED = 3


@contextmanager
def frozen_apparatus():
    """
    Load immutable Git objects rather than another path
    to the instrumented working-tree classes.
    """

    with patch.dict(sys.modules):
        modules = {}

        for name in (
            "environment",
            "gates",
            "proposers",
            "run_experiment",
        ):
            source = subprocess.check_output(
                [
                    "git",
                    "show",
                    (
                        f"{FROZEN_COMMIT}:"
                        "experiments/adaptive-gate-search/"
                        f"{name}.py"
                    ),
                ],
                cwd=trace.BASE,
                text=True,
                encoding="utf-8",
            )

            module = types.ModuleType(name)

            module.__file__ = (
                f"git:{FROZEN_COMMIT}/{name}.py"
            )

            sys.modules[name] = module

            exec(
                compile(
                    source,
                    module.__file__,
                    "exec",
                ),
                module.__dict__,
            )

            modules[name] = module

        yield modules


class Recorder:
    def __init__(
        self,
        factory,
        truth,
    ):
        self.factory = factory
        self.truth = truth
        self.calls = []
        self.rows = []

    def build(
        self,
        name,
        rng,
        *,
        budget,
    ):
        proposer = self.factory(
            name,
            rng,
            budget=budget,
        )

        original_next = (
            proposer.next_proposal
        )

        original_observe = (
            proposer.observe
        )

        def next_proposal():
            self.calls.append(
                "proposal"
            )

            point = original_next()

            self.rows.append(
                {
                    "x1": point.x1,
                    "x2": point.x2,
                    "rng": rng.getstate(),
                }
            )

            return point

        def observe(
            point,
            admitted,
            score=None,
        ):
            self.calls.append(
                "feedback"
            )

            self.rows[-1].update(
                feedback_admitted=int(
                    admitted
                ),
                feedback_score=score,
            )

            original_observe(
                point,
                admitted,
                score,
            )

            self.rows[-1][
                "rng_after_observe"
            ] = rng.getstate()

        proposer.next_proposal = (
            next_proposal
        )

        proposer.observe = observe

        return proposer

    def gate(
        self,
        gate,
    ):
        recorder = self

        class Gate:
            def evaluate(
                self,
                point,
            ):
                recorder.calls.append(
                    "gate"
                )

                result = gate.evaluate(
                    point
                )

                recorder.rows[-1].update(
                    gate_admitted=int(
                        result.admitted
                    ),
                    gate_score=result.score,
                )

                return result

        return Gate()

    def evaluate_truth(
        self,
        point,
    ):
        self.calls.append(
            "truth"
        )

        result = self.truth(
            point
        )

        self.rows[-1][
            "true_admissible"
        ] = int(result)

        return result


class TraceEquivalence(
    unittest.TestCase
):
    def test_frozen_first_escape_and_continuation(
        self,
    ):
        modes = set()

        saw_escape = False
        saw_no_escape = False
        saw_repeated = False

        checked = 0

        with frozen_apparatus() as frozen:
            original = frozen[
                "run_experiment"
            ]

            for geometry in (
                trace.GEOMETRIES
            ):
                for proposer in (
                    trace.PROPOSERS
                ):
                    for master_seed in (
                        VALIDATION_SEEDS
                    ):
                        for episode in range(
                            EPISODES_PER_SEED
                        ):
                            with self.subTest(
                                geometry=geometry,
                                proposer=proposer,
                                seed=master_seed,
                                episode=episode,
                            ):
                                baseline = Recorder(
                                    frozen[
                                        "proposers"
                                    ].build_proposer,
                                    frozen[
                                        "environment"
                                    ].g_star,
                                )

                                with patch.object(
                                    original,
                                    "build_proposer",
                                    baseline.build,
                                ), patch.object(
                                    original,
                                    "g_star",
                                    baseline.evaluate_truth,
                                ):
                                    result = (
                                        original.run_episode(
                                            gate=baseline.gate(
                                                original.build_gate(
                                                    geometry
                                                )
                                            ),
                                            geometry=geometry,
                                            proposer_name=proposer,
                                            budget=256,
                                            episode=episode,
                                            master_seed=master_seed,
                                        )
                                    )

                                instrumented = Recorder(
                                    trace.build_proposer,
                                    trace.g_star,
                                )

                                with patch.object(
                                    trace,
                                    "build_proposer",
                                    instrumented.build,
                                ), patch.object(
                                    trace,
                                    "g_star",
                                    instrumented.evaluate_truth,
                                ):
                                    rows = list(
                                        trace.trace_episode(
                                            gate=instrumented.gate(
                                                trace.build_gate(
                                                    geometry
                                                )
                                            ),
                                            geometry=geometry,
                                            proposer_name=proposer,
                                            episode=episode,
                                            master_seed=master_seed,
                                        )
                                    )

                                self.assertEqual(
                                    len(rows),
                                    256,
                                )

                                n = result[
                                    "queries_used"
                                ]

                                self.assertEqual(
                                    baseline.calls,
                                    [
                                        "proposal",
                                        "gate",
                                        "feedback",
                                        "truth",
                                    ]
                                    * n,
                                )

                                self.assertEqual(
                                    instrumented.calls,
                                    [
                                        "proposal",
                                        "gate",
                                        "feedback",
                                        "truth",
                                    ]
                                    * 256,
                                )

                                # Exact pre-escape behavior:
                                # proposal floats, scores,
                                # feedback, truth and RNG state.
                                self.assertEqual(
                                    baseline.rows,
                                    instrumented.rows[
                                        :n
                                    ],
                                )

                                for (
                                    row,
                                    recorded,
                                ) in zip(
                                    rows,
                                    instrumented.rows,
                                ):
                                    self.assertEqual(
                                        set(row),
                                        set(
                                            trace.FIELDNAMES
                                        ),
                                    )

                                    for field in (
                                        "x1",
                                        "x2",
                                        "gate_admitted",
                                        "gate_score",
                                        "feedback_admitted",
                                        "feedback_score",
                                        "true_admissible",
                                    ):
                                        self.assertEqual(
                                            row[field],
                                            recorded[
                                                field
                                            ],
                                            field,
                                        )

                                self.assertEqual(
                                    rows[-1][
                                        "first_escape_interaction_index"
                                    ],
                                    result[
                                        "escape_query"
                                    ]
                                    or None,
                                )

                                self.assertEqual(
                                    rows[-1][
                                        "first_escape_invalid_query_index"
                                    ],
                                    result[
                                        "escape_invalid_query"
                                    ]
                                    or None,
                                )

                                # The scientific trace benchmark
                                # seed is frozen at 20261006.
                                #
                                # This validator also deliberately
                                # uses seed 17 as an engineering-only
                                # equivalence test. Construct official
                                # configuration first, then replace
                                # only the metadata seed used by the
                                # episode validator.
                                validation_metadata = (
                                    trace.configuration()
                                )

                                validation_metadata[
                                    "master_seed"
                                ] = master_seed

                                validate_episode(
                                    rows,
                                    geometry,
                                    proposer,
                                    episode,
                                    validation_metadata,
                                )

                                # Continue the immutable frozen
                                # proposer under the historical
                                # operational feedback process.
                                #
                                # This independently checks that
                                # passive trace instrumentation does
                                # not alter the later 256-step
                                # counterfactual continuation.
                                continuation = frozen[
                                    "proposers"
                                ].build_proposer(
                                    proposer,
                                    frozen[
                                        "run_experiment"
                                    ].random.Random(
                                        result[
                                            "episode_seed"
                                        ]
                                    ),
                                    budget=256,
                                )

                                gate = (
                                    original.build_gate(
                                        geometry
                                    )
                                )

                                for row in rows:
                                    point = (
                                        continuation.next_proposal()
                                    )

                                    decision = (
                                        gate.evaluate(
                                            point
                                        )
                                    )

                                    continuation.observe(
                                        point,
                                        decision.admitted,
                                        (
                                            decision.score
                                            if proposer
                                            == "score"
                                            else None
                                        ),
                                    )

                                    self.assertEqual(
                                        (
                                            point.x1,
                                            point.x2,
                                            int(
                                                decision.admitted
                                            ),
                                            decision.score,
                                        ),
                                        (
                                            row["x1"],
                                            row["x2"],
                                            row[
                                                "gate_admitted"
                                            ],
                                            row[
                                                "gate_score"
                                            ],
                                        ),
                                    )

                                modes.update(
                                    row[
                                        "proposal_mode"
                                    ]
                                    for row in rows
                                )

                                saw_escape |= bool(
                                    result[
                                        "escaped"
                                    ]
                                )

                                saw_no_escape |= (
                                    not bool(
                                        result[
                                            "escaped"
                                        ]
                                    )
                                )

                                saw_repeated |= (
                                    sum(
                                        row[
                                            "false_admission"
                                        ]
                                        for row
                                        in rows
                                    )
                                    > 1
                                )

                                checked += 1

        self.assertEqual(
            modes,
            set(
                trace.PROPOSAL_MODES
            ),
        )

        self.assertTrue(
            saw_escape
            and saw_no_escape
            and saw_repeated
        )

        print(
            "EQUIVALENCE PASS: "
            f"{checked} episode pairs; "
            "all 8 conditions; "
            "2 master seeds; "
            "exact pre-escape behavior and RNG state; "
            "256-step continuation; "
            "all proposal modes. "
            "No trace artifacts written."
        )


if __name__ == "__main__":
    unittest.main(
        verbosity=2
    )