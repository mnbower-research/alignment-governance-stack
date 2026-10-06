"""Prospective Trace Benchmark 001. Importing/validating never runs episodes."""
from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import json
import random
import subprocess
from collections.abc import Iterator
from datetime import datetime, timezone
from pathlib import Path

from environment import g_star
from proposers import build_proposer, task_utility
from run_experiment import (
    DEFAULT_BUDGETS,
    GEOMETRIES,
    PROPOSERS,
    PROTOCOL_VERSION,
    build_gate,
    stable_seed,
)


BENCHMARK_VERSION = "001"
MASTER_SEED = 20261006
MAXIMUM_BUDGET = 256
TRIALS = 10_000
PREFIX_BUDGETS = tuple(DEFAULT_BUDGETS)
BASE = Path(__file__).resolve().parent

DEFAULT_OUTPUT = (
    BASE
    / "results"
    / "trace_benchmark_001"
    / "raw"
    / "ictf_adaptive_gate_search_trace_001.csv.gz"
)

SOURCE_PLANS = (
    "TRACE_BENCHMARK_PLAN_001.md",
    "TRACE_BENCHMARK_AMENDMENT_001.md",
    "TRACE_BENCHMARK_AMENDMENT_002.md",
)

PROPOSAL_MODES = (
    "iid_random",
    "nonadaptive_ranked",
    "initial_random",
    "random_restart",
    "local_search",
)

STATE_FIELDS = (
    "anchor_x1",
    "anchor_x2",
    "anchor_utility",
    "last_admitted",
    "last_score",
)

FIELDNAMES = (
    "benchmark_version",
    "protocol_version",
    "master_seed",
    "episode_seed",
    "episode_id",
    "geometry",
    "proposer",
    "maximum_budget",
    "total_interaction_index",
    "invalid_query_index",
    "prior_valid_query_count",
    "prior_invalid_query_count",
    "x1",
    "x2",
    "utility",
    "true_admissible",
    "independently_invalid",
    "gate_admitted",
    "gate_score",
    "false_admission",
    "escaped_previously",
    "is_first_false_admission",
    "first_escape_interaction_index",
    "first_escape_invalid_query_index",
    "feedback_admitted",
    "feedback_score",
    "proposal_mode",
    "anchor_x1_before",
    "anchor_x2_before",
    "anchor_utility_before",
    "last_admitted_before",
    "last_score_before",
    "sigma_used",
    "push_used",
    "anchor_x1_after",
    "anchor_x2_after",
    "anchor_utility_after",
    "last_admitted_after",
    "last_score_after",
)

INTEGER_FIELDS = frozenset(
    (
        "master_seed",
        "episode_seed",
        "episode_id",
        "maximum_budget",
        "total_interaction_index",
        "invalid_query_index",
        "prior_valid_query_count",
        "prior_invalid_query_count",
        "first_escape_interaction_index",
        "first_escape_invalid_query_index",
    )
)

BOOLEAN_FIELDS = frozenset(
    (
        "true_admissible",
        "independently_invalid",
        "gate_admitted",
        "false_admission",
        "escaped_previously",
        "is_first_false_admission",
        "feedback_admitted",
        "last_admitted_before",
        "last_admitted_after",
    )
)

TEXT_FIELDS = frozenset(
    (
        "benchmark_version",
        "protocol_version",
        "geometry",
        "proposer",
        "proposal_mode",
    )
)

NULLABLE_FIELDS = frozenset(
    (
        "invalid_query_index",
        "first_escape_interaction_index",
        "first_escape_invalid_query_index",
        "feedback_score",
        "sigma_used",
        "push_used",
        *(
            f"{field}_{when}"
            for field in STATE_FIELDS
            for when in ("before", "after")
        ),
    )
)


def schema() -> list[dict]:
    return [
        {
            "name": name,
            "type": (
                "integer"
                if name in INTEGER_FIELDS
                else "boolean_0_1"
                if name in BOOLEAN_FIELDS
                else "string"
                if name in TEXT_FIELDS
                else "float"
            ),
            "nullable": name in NULLABLE_FIELDS,
        }
        for name in FIELDNAMES
    ]


def snapshot(proposer, when: str) -> dict:
    """Read existing state; normalize the uninitialized -inf sentinel to null."""
    state = getattr(proposer, "state", None)
    anchor = state.anchor if state else None

    values = (
        anchor.x1 if anchor else None,
        anchor.x2 if anchor else None,
        state.anchor_utility if anchor else None,
        (
            int(state.last_admitted)
            if state and state.last_admitted is not None
            else None
        ),
        state.last_score if state else None,
    )

    return {
        f"{field}_{when}": value
        for field, value in zip(STATE_FIELDS, values)
    }


def trace_episode(
    *,
    gate,
    geometry: str,
    proposer_name: str,
    episode: int,
    master_seed: int = MASTER_SEED,
) -> Iterator[dict]:
    """Yield one complete fixed-horizon trajectory; evaluator labels stay external."""

    if (
        geometry not in GEOMETRIES
        or proposer_name not in PROPOSERS
        or episode < 0
    ):
        raise ValueError("Invalid episode identity")

    seed = stable_seed(
        master_seed,
        geometry,
        proposer_name,
        MAXIMUM_BUDGET,
        episode,
    )

    proposer = build_proposer(
        proposer_name,
        random.Random(seed),
        budget=MAXIMUM_BUDGET,
    )

    valid_count = 0
    invalid_count = 0
    first_k = None
    first_t = None

    identity = dict(
        benchmark_version=BENCHMARK_VERSION,
        protocol_version=PROTOCOL_VERSION,
        master_seed=master_seed,
        episode_seed=seed,
        episode_id=episode,
        geometry=geometry,
        proposer=proposer_name,
        maximum_budget=MAXIMUM_BUDGET,
    )

    for k in range(1, MAXIMUM_BUDGET + 1):
        before = snapshot(proposer, "before")

        proposal = proposer.next_proposal()

        decision = gate.evaluate(proposal)

        feedback_score = (
            decision.score
            if proposer_name == "score"
            else None
        )

        # Preserve even the historical no-op observe calls
        # for random and nonadaptive proposers.
        proposer.observe(
            proposal,
            decision.admitted,
            feedback_score,
        )

        after = snapshot(proposer, "after")

        # Held-out evaluation occurs only after operational feedback.
        true_admissible = g_star(proposal)

        invalid = not true_admissible

        false_admission = (
            decision.admitted
            and invalid
        )

        escaped_previously = first_k is not None

        first = (
            false_admission
            and not escaped_previously
        )

        t = (
            invalid_count + 1
            if invalid
            else None
        )

        if first:
            first_k = k
            first_t = t

        if proposer_name == "random":
            mode = "iid_random"
        elif proposer_name == "nonadaptive":
            mode = "nonadaptive_ranked"
        else:
            mode = proposer.trace_proposal_mode

        yield {
            **identity,
            "total_interaction_index": k,
            "invalid_query_index": t,
            "prior_valid_query_count": valid_count,
            "prior_invalid_query_count": invalid_count,
            "x1": proposal.x1,
            "x2": proposal.x2,
            "utility": task_utility(proposal),
            "true_admissible": int(true_admissible),
            "independently_invalid": int(invalid),
            "gate_admitted": int(decision.admitted),
            "gate_score": decision.score,
            "false_admission": int(false_admission),
            "escaped_previously": int(escaped_previously),
            "is_first_false_admission": int(first),
            "first_escape_interaction_index": first_k,
            "first_escape_invalid_query_index": first_t,
            "feedback_admitted": int(decision.admitted),
            "feedback_score": feedback_score,
            "proposal_mode": mode,
            **before,
            "sigma_used": getattr(
                proposer,
                "trace_sigma_used",
                None,
            ),
            "push_used": getattr(
                proposer,
                "trace_push_used",
                None,
            ),
            **after,
        }

        valid_count += int(true_admissible)
        invalid_count += int(invalid)


def configuration(
    master_seed: int = MASTER_SEED,
) -> dict:
    if master_seed != MASTER_SEED:
        raise ValueError(
            f"Trace Benchmark 001 master seed is frozen at {MASTER_SEED}"
        )

    return {
        "benchmark_name": "ICTF Trace Benchmark 001",
        "benchmark_version": BENCHMARK_VERSION,
        "protocol_version": PROTOCOL_VERSION,
        "master_seed": master_seed,
        "trials_per_condition": TRIALS,
        "fixed_horizon": MAXIMUM_BUDGET,
        "derived_prefix_budgets": list(PREFIX_BUDGETS),
        "geometries": GEOMETRIES,
        "proposers": PROPOSERS,
        "total_episode_count": (
            TRIALS
            * len(GEOMETRIES)
            * len(PROPOSERS)
        ),
        "maximum_possible_trace_row_count": (
            TRIALS
            * len(GEOMETRIES)
            * len(PROPOSERS)
            * MAXIMUM_BUDGET
        ),
        "continuation_after_first_escape": (
            "all episodes continue through interaction 256; "
            "first indices immutable"
        ),
        "post_escape_interpretation": (
            "counterfactual continuation for mechanism analysis only"
        ),
        "g_star_visibility": (
            "held-out evaluator only, after proposer feedback; "
            "never supplied to proposer"
        ),
        "feedback_semantics": (
            "observe gets admission for all; "
            "random/nonadaptive ignore it; "
            "only score gets score"
        ),
        "source_plans": list(SOURCE_PLANS),
        "seed_derivation": (
            "historical stable_seed("
            "master_seed, geometry, proposer, 256, "
            "zero_based_episode_id)"
        ),
        "episode_identity": (
            "(geometry, proposer, episode_id); "
            "episode_id is condition-local, zero-based"
        ),
        "csv_null": (
            "empty cell; uninitialized anchor utility "
            "-inf serialized as null"
        ),
        "schema": schema(),
    }


def run_experiment(
    output_path: Path,
    master_seed: int = MASTER_SEED,
) -> None:
    metadata = configuration(master_seed)

    output_path = output_path.resolve()

    metadata_path = output_path.with_suffix(
        ".metadata.json"
    )

    for path in (
        output_path,
        metadata_path,
    ):
        if path.exists():
            raise FileExistsError(
                f"Refusing to overwrite: {path}"
            )

    if not output_path.name.endswith(".csv.gz"):
        raise ValueError(
            "Output must end in .csv.gz"
        )

    metadata.update(
        git_commit=subprocess.check_output(
            ["git", "rev-parse", "HEAD"],
            cwd=BASE,
            text=True,
        ).strip(),
        created_utc=datetime.now(
            timezone.utc
        ).isoformat(),
        raw_output=str(output_path),
        source_sha256={
            name: hashlib.sha256(
                (BASE / name).read_bytes()
            ).hexdigest()
            for name in (
                *SOURCE_PLANS,
                "trace_run_experiment.py",
                "trace_analysis.py",
                "proposers.py",
                "gates.py",
                "environment.py",
                "run_experiment.py",
            )
        },
        status="incomplete",
        rows_written=0,
    )

    output_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    # Exclusive creation closes the existence-check race.
    # Interrupted artifacts are retained.
    with metadata_path.open(
        "x+",
        encoding="utf-8",
    ) as meta:
        json.dump(
            metadata,
            meta,
            indent=2,
            allow_nan=False,
        )
        meta.flush()

        rows_written = 0

        with gzip.open(
            output_path,
            "xt",
            newline="",
            encoding="utf-8",
        ) as handle:
            writer = csv.DictWriter(
                handle,
                fieldnames=FIELDNAMES,
            )
            writer.writeheader()

            for geometry in GEOMETRIES:
                gate = build_gate(geometry)

                for proposer_name in PROPOSERS:
                    for episode in range(TRIALS):
                        for row in trace_episode(
                            gate=gate,
                            geometry=geometry,
                            proposer_name=proposer_name,
                            episode=episode,
                            master_seed=master_seed,
                        ):
                            writer.writerow(row)
                            rows_written += 1

                    print(
                        f"completed {geometry} "
                        f"{proposer_name}: "
                        f"{TRIALS} episodes"
                    )

        metadata.update(
            status="complete",
            rows_written=rows_written,
        )

        meta.seek(0)

        json.dump(
            metadata,
            meta,
            indent=2,
            allow_nan=False,
        )

        meta.truncate()


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__
    )

    parser.add_argument(
        "--validate-config",
        action="store_true",
    )

    parser.add_argument(
        "--master-seed",
        type=int,
        default=MASTER_SEED,
    )

    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
    )

    args = parser.parse_args()

    if args.validate_config:
        print("TRACE CONFIGURATION VALID")

        print(
            json.dumps(
                configuration(args.master_seed),
                indent=2,
                allow_nan=False,
            )
        )

        print(
            "No episodes executed; "
            "no output or metadata created."
        )

        return

    run_experiment(
        args.output,
        args.master_seed,
    )


if __name__ == "__main__":
    main()