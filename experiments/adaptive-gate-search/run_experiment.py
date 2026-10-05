from __future__ import annotations

import argparse
import csv
import hashlib
import json
import random
import subprocess
from datetime import datetime, timezone
from pathlib import Path

from environment import g_star
from gates import StructuredGate, UnstructuredGate
from proposers import build_proposer, task_utility


PROTOCOL_VERSION = "0.1"
MASTER_SEED_DEFAULT = 20261004

DEFAULT_BUDGETS = [
    1,
    2,
    4,
    8,
    16,
    32,
    64,
    128,
    256,
]

DEFAULT_TRIALS = 10_000

GEOMETRIES = [
    "structured",
    "unstructured",
]

PROPOSERS = [
    "random",
    "nonadaptive",
    "binary",
    "score",
]

FIELDNAMES = [
    "protocol_version",
    "master_seed",
    "geometry",
    "proposer",
    "budget",
    "episode",
    "episode_seed",
    "escaped",
    "escape_query",
    "escape_invalid_query",
    "queries_used",
    "invalid_queries",
    "admitted_queries",
    "escape_x1",
    "escape_x2",
    "escape_utility",
    "escape_gate_score",
    "escape_true_admissible",
    "observability",
]


def stable_seed(
    master_seed: int,
    geometry: str,
    proposer: str,
    budget: int,
    episode: int,
) -> int:
    """
    Produce a deterministic per-episode seed.

    SHA-256 is used instead of Python's built-in hash so seeds are
    stable across Python processes and machines.
    """
    payload = (
        f"{master_seed}|{geometry}|{proposer}|"
        f"{budget}|{episode}"
    ).encode("utf-8")

    digest = hashlib.sha256(payload).digest()

    return int.from_bytes(digest[:8], "big")


def build_gate(geometry: str):
    if geometry == "structured":
        return StructuredGate()

    if geometry == "unstructured":
        return UnstructuredGate()

    raise ValueError(f"Unknown geometry: {geometry}")


def get_git_commit() -> str:
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "HEAD"],
            text=True,
        ).strip()
    except Exception:
        return "unknown"


def run_episode(
    *,
    gate,
    geometry: str,
    proposer_name: str,
    budget: int,
    episode: int,
    master_seed: int,
) -> dict:
    """
    Run one independent search episode.

    Operational ordering:

    1. proposer produces x
    2. operational gate evaluates x
    3. proposer receives its permitted feedback
    4. held-out G* evaluates x
    5. evaluator determines whether a false admission occurred

    G* is never supplied to the proposer or operational gate.

    The episode terminates on the first false admission or when
    the query budget is exhausted.
    """

    episode_seed = stable_seed(
        master_seed,
        geometry,
        proposer_name,
        budget,
        episode,
    )

    rng = random.Random(episode_seed)

    proposer = build_proposer(
        proposer_name,
        rng,
        budget=budget,
    )

    invalid_queries = 0
    admitted_queries = 0

    for query_index in range(1, budget + 1):
        proposal = proposer.next_proposal()

        # Operational gate acts before held-out G* evaluation.
        decision = gate.evaluate(proposal)

        if decision.admitted:
            admitted_queries += 1

        # Feedback permitted by proposer condition.
        if proposer_name == "score":
            proposer.observe(
                proposal,
                decision.admitted,
                decision.score,
            )
        else:
            proposer.observe(
                proposal,
                decision.admitted,
                None,
            )

        # Held-out evaluator. This result is not returned to proposer.
        true_admissible = g_star(proposal)

        if not true_admissible:
            invalid_queries += 1

        false_admission = (
            decision.admitted
            and not true_admissible
        )

        if false_admission:
            return {
                "protocol_version": PROTOCOL_VERSION,
                "master_seed": master_seed,
                "geometry": geometry,
                "proposer": proposer_name,
                "budget": budget,
                "episode": episode,
                "episode_seed": episode_seed,
                "escaped": 1,
                "escape_query": query_index,
                "escape_invalid_query": invalid_queries,
                "queries_used": query_index,
                "invalid_queries": invalid_queries,
                "admitted_queries": admitted_queries,
                "escape_x1": proposal.x1,
                "escape_x2": proposal.x2,
                "escape_utility": task_utility(proposal),
                "escape_gate_score": decision.score,
                "escape_true_admissible": 0,
                # Phase 1 has complete proposal evidence available
                # to the operational gate; false admission is therefore
                # classified as judgment failure rather than missing
                # evidence.
                "observability": 1,
            }

    return {
        "protocol_version": PROTOCOL_VERSION,
        "master_seed": master_seed,
        "geometry": geometry,
        "proposer": proposer_name,
        "budget": budget,
        "episode": episode,
        "episode_seed": episode_seed,
        "escaped": 0,
        "escape_query": "",
        "escape_invalid_query": "",
        "queries_used": budget,
        "invalid_queries": invalid_queries,
        "admitted_queries": admitted_queries,
        "escape_x1": "",
        "escape_x2": "",
        "escape_utility": "",
        "escape_gate_score": "",
        "escape_true_admissible": "",
        "observability": "",
    }


def write_metadata(
    *,
    metadata_path: Path,
    output_path: Path,
    trials: int,
    budgets: list[int],
    master_seed: int,
) -> None:
    metadata = {
        "experiment": "ICTF Adaptive Gate Search",
        "protocol_version": PROTOCOL_VERSION,
        "preregistration_tag":
            "ictf-adaptive-gate-search-prereg-v0.1",
        "calibration_tag":
            "ictf-adaptive-gate-search-calibration-v0.1",
        "proposer_specification_tag":
            "ictf-adaptive-gate-search-proposers-v0.1",
        "git_commit": get_git_commit(),
        "created_utc":
            datetime.now(timezone.utc).isoformat(),
        "master_seed": master_seed,
        "trials_per_condition": trials,
        "budgets": budgets,
        "geometries": GEOMETRIES,
        "proposers": PROPOSERS,
        "raw_output": str(output_path),
        "episode_count":
            len(GEOMETRIES)
            * len(PROPOSERS)
            * len(budgets)
            * trials,
        "termination":
            "first false admission or exhausted budget",
        "g_star_visibility":
            "held-out evaluator only",
        "phase_1_observability":
            "O=1 for false admissions by construction",
    }

    metadata_path.write_text(
        json.dumps(metadata, indent=2),
        encoding="utf-8",
    )


def run_experiment(
    *,
    output_path: Path,
    trials: int,
    budgets: list[int],
    master_seed: int,
) -> None:
    if trials <= 0:
        raise ValueError("trials must be positive")

    if any(budget <= 0 for budget in budgets):
        raise ValueError("all budgets must be positive")

    output_path = output_path.resolve()

    metadata_path = output_path.with_suffix(
        ".metadata.json"
    )

    if output_path.exists():
        raise FileExistsError(
            f"Refusing to overwrite existing results: {output_path}"
        )

    if metadata_path.exists():
        raise FileExistsError(
            f"Refusing to overwrite metadata: {metadata_path}"
        )

    output_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with output_path.open(
        "w",
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
                for budget in budgets:
                    for episode in range(trials):
                        row = run_episode(
                            gate=gate,
                            geometry=geometry,
                            proposer_name=proposer_name,
                            budget=budget,
                            episode=episode,
                            master_seed=master_seed,
                        )

                        writer.writerow(row)

                    print(
                        "completed",
                        geometry,
                        proposer_name,
                        f"M={budget}",
                        f"episodes={trials}",
                    )

    write_metadata(
        metadata_path=metadata_path,
        output_path=output_path,
        trials=trials,
        budgets=budgets,
        master_seed=master_seed,
    )

    print(f"raw results: {output_path}")
    print(f"metadata: {metadata_path}")


def validate_config(
    *,
    trials: int,
    budgets: list[int],
    master_seed: int,
) -> None:
    if trials <= 0:
        raise ValueError("trials must be positive")

    if any(budget <= 0 for budget in budgets):
        raise ValueError("all budgets must be positive")

    episode_count = (
        len(GEOMETRIES)
        * len(PROPOSERS)
        * len(budgets)
        * trials
    )

    print("CONFIGURATION VALID")
    print("protocol_version =", PROTOCOL_VERSION)
    print("master_seed =", master_seed)
    print("trials_per_condition =", trials)
    print("budgets =", budgets)
    print("geometries =", GEOMETRIES)
    print("proposers =", PROPOSERS)
    print("total_episodes =", episode_count)
    print("No experiment was executed.")


def parse_args() -> argparse.Namespace:
    base_dir = Path(__file__).resolve().parent

    default_output = (
        base_dir
        / "results"
        / "raw"
        / "ictf_adaptive_gate_search_raw.csv"
    )

    parser = argparse.ArgumentParser(
        description="Run the preregistered ICTF adaptive gate search benchmark."
    )

    parser.add_argument(
        "--trials",
        type=int,
        default=DEFAULT_TRIALS,
    )

    parser.add_argument(
        "--budgets",
        type=int,
        nargs="+",
        default=DEFAULT_BUDGETS,
    )

    parser.add_argument(
        "--master-seed",
        type=int,
        default=MASTER_SEED_DEFAULT,
    )

    parser.add_argument(
        "--output",
        type=Path,
        default=default_output,
    )

    parser.add_argument(
        "--validate-config",
        action="store_true",
        help="Validate configuration without executing any episodes.",
    )

    return parser.parse_args()


def main() -> None:
    args = parse_args()

    if args.validate_config:
        validate_config(
            trials=args.trials,
            budgets=args.budgets,
            master_seed=args.master_seed,
        )
        return

    run_experiment(
        output_path=args.output,
        trials=args.trials,
        budgets=args.budgets,
        master_seed=args.master_seed,
    )


if __name__ == "__main__":
    main()



