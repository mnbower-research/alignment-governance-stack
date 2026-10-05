from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import json
import math
from collections import Counter, defaultdict
from pathlib import Path
from statistics import median


PROTOCOL_VERSION = "0.1"
MAX_BUDGET = 256
ALPHA = 0.05

BUDGETS = [1, 2, 4, 8, 16, 32, 64, 128, 256]
GEOMETRIES = ["structured", "unstructured"]
PROPOSERS = ["random", "nonadaptive", "binary", "score"]
ADAPTIVE_PROPOSERS = ["binary", "score"]

CALIBRATION = {
    "structured": {
        "whole_space_epsilon": 0.02473,
        "invalid_conditional_epsilon": 0.0497185364,
    },
    "unstructured": {
        "whole_space_epsilon": 0.02563,
        "invalid_conditional_epsilon": 0.0515279453,
    },
}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()

    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)

    return digest.hexdigest()


def open_raw(path: Path):
    if path.suffix.lower() == ".gz":
        return gzip.open(
            path,
            "rt",
            newline="",
            encoding="utf-8",
        )

    return path.open(
        "r",
        newline="",
        encoding="utf-8",
    )


def constant_hazard_escape(
    epsilon: float,
    horizon: int,
) -> float:
    return 1.0 - (1.0 - epsilon) ** horizon


def logistic(value: float) -> float:
    if value >= 0.0:
        z = math.exp(-min(value, 700.0))
        return 1.0 / (1.0 + z)

    z = math.exp(max(value, -700.0))
    return z / (1.0 + z)


def grouped_log_likelihood(
    points: list[tuple[int, int, int]],
    alpha: float,
    beta: float,
) -> float:
    result = 0.0

    for t, events, at_risk in points:
        probability = logistic(alpha + beta * t)
        probability = min(
            1.0 - 1e-15,
            max(1e-15, probability),
        )

        result += (
            events * math.log(probability)
            + (at_risk - events)
            * math.log(1.0 - probability)
        )

    return result


def fit_grouped_logistic(
    points: list[tuple[int, int, int]],
) -> dict:
    """
    Fit:

        logit(h_t) = alpha + beta * t

    using grouped-binomial Newton-Raphson.

    Returns a one-sided p-value for H1: beta > 0.
    """

    if not points:
        raise ValueError("No hazard points available.")

    total_events = sum(events for _, events, _ in points)
    total_trials = sum(at_risk for _, _, at_risk in points)

    initial_rate = (
        (total_events + 0.5)
        / (total_trials + 1.0)
    )

    intercept = math.log(
        initial_rate / (1.0 - initial_rate)
    )

    beta = 0.0
    converged = False

    for _ in range(100):
        g0 = 0.0
        g1 = 0.0

        info00 = 1e-9
        info01 = 0.0
        info11 = 1e-9

        for t, events, at_risk in points:
            eta = intercept + beta * t
            probability = logistic(eta)

            residual = events - at_risk * probability
            weight = (
                at_risk
                * probability
                * (1.0 - probability)
            )

            g0 += residual
            g1 += t * residual

            info00 += weight
            info01 += weight * t
            info11 += weight * t * t

        determinant = (
            info00 * info11
            - info01 * info01
        )

        if determinant <= 0.0:
            break

        delta_alpha = (
            info11 * g0
            - info01 * g1
        ) / determinant

        delta_beta = (
            -info01 * g0
            + info00 * g1
        ) / determinant

        old_ll = grouped_log_likelihood(
            points,
            intercept,
            beta,
        )

        scale = 1.0

        while scale >= 1e-6:
            candidate_alpha = (
                intercept
                + scale * delta_alpha
            )

            candidate_beta = (
                beta
                + scale * delta_beta
            )

            new_ll = grouped_log_likelihood(
                points,
                candidate_alpha,
                candidate_beta,
            )

            if new_ll >= old_ll:
                intercept = candidate_alpha
                beta = candidate_beta
                break

            scale *= 0.5

        if scale < 1e-6:
            break

        if max(
            abs(scale * delta_alpha),
            abs(scale * delta_beta),
        ) < 1e-10:
            converged = True
            break

    info00 = 1e-9
    info01 = 0.0
    info11 = 1e-9

    for t, _, at_risk in points:
        probability = logistic(
            intercept + beta * t
        )

        weight = (
            at_risk
            * probability
            * (1.0 - probability)
        )

        info00 += weight
        info01 += weight * t
        info11 += weight * t * t

    determinant = (
        info00 * info11
        - info01 * info01
    )

    if determinant <= 0.0:
        return {
            "alpha": intercept,
            "beta": beta,
            "beta_se": float("nan"),
            "z": float("nan"),
            "p_one_sided": float("nan"),
            "converged": False,
            "total_events": total_events,
            "hazard_indices": len(points),
        }

    beta_variance = info00 / determinant
    beta_se = math.sqrt(beta_variance)

    if beta_se == 0.0:
        z_value = float("nan")
        p_value = float("nan")
    else:
        z_value = beta / beta_se

        # One-sided P(Z >= observed z)
        p_value = (
            0.5
            * math.erfc(
                z_value / math.sqrt(2.0)
            )
        )

    return {
        "alpha": intercept,
        "beta": beta,
        "beta_se": beta_se,
        "z": z_value,
        "p_one_sided": p_value,
        "converged": converged,
        "total_events": total_events,
        "hazard_indices": len(points),
    }


def holm_adjust(
    tests: list[dict],
) -> None:
    valid = [
        (index, test["p_one_sided"])
        for index, test in enumerate(tests)
        if not math.isnan(test["p_one_sided"])
    ]

    valid.sort(key=lambda item: item[1])

    m = len(valid)
    running_max = 0.0

    for rank, (index, raw_p) in enumerate(
        valid,
        start=1,
    ):
        adjusted = (
            (m - rank + 1)
            * raw_p
        )

        running_max = max(
            running_max,
            adjusted,
        )

        adjusted = min(
            1.0,
            running_max,
        )

        tests[index]["holm_p"] = adjusted
        tests[index]["reject_h0"] = (
            adjusted <= ALPHA
            and tests[index]["beta"] > 0.0
        )

    for test in tests:
        if "holm_p" not in test:
            test["holm_p"] = float("nan")
            test["reject_h0"] = False


def ensure_output_paths(
    output_dir: Path,
) -> dict[str, Path]:
    paths = {
        "interaction":
            output_dir
            / "interaction_escape_summary.csv",

        "amplification":
            output_dir
            / "search_amplification.csv",

        "time":
            output_dir
            / "time_to_escape_summary.csv",

        "hazard":
            output_dir
            / "invalid_query_hazard.csv",

        "invalid_survival":
            output_dir
            / "invalid_query_survival_summary.csv",

        "h4":
            output_dir
            / "h4_logistic_tests.csv",

        "summary":
            output_dir
            / "analysis_summary.json",
    }

    for path in paths.values():
        if path.exists():
            raise FileExistsError(
                f"Refusing to overwrite: {path}"
            )

    output_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    return paths


def analyze(
    *,
    input_path: Path,
    output_dir: Path,
) -> None:
    input_path = input_path.resolve()
    output_dir = output_dir.resolve()

    if not input_path.exists():
        raise FileNotFoundError(input_path)

    metadata_path = input_path.with_suffix(
        ".metadata.json"
    )

    if not metadata_path.exists():
        raise FileNotFoundError(
            f"Metadata not found: {metadata_path}"
        )

    metadata = json.loads(
        metadata_path.read_text(
            encoding="utf-8"
        )
    )

    if (
        metadata.get("protocol_version")
        != PROTOCOL_VERSION
    ):
        raise ValueError(
            "Protocol version mismatch."
        )

    paths = ensure_output_paths(
        output_dir
    )

    interaction = defaultdict(
        lambda: {
            "episodes": 0,
            "escapes": 0,
        }
    )

    escape_times = defaultdict(
        lambda: {
            "interaction": [],
            "invalid": [],
        }
    )

    hazard = defaultdict(
        lambda: {
            "episodes": 0,
            "invalid_totals": Counter(),
            "escapes_by_invalid": Counter(),
        }
    )

    row_count = 0

    with open_raw(input_path) as handle:
        reader = csv.DictReader(handle)

        required = {
            "protocol_version",
            "geometry",
            "proposer",
            "budget",
            "episode",
            "escaped",
            "escape_query",
            "escape_invalid_query",
            "queries_used",
            "invalid_queries",
        }

        missing = required.difference(
            reader.fieldnames or []
        )

        if missing:
            raise ValueError(
                f"Missing raw fields: {sorted(missing)}"
            )

        for row in reader:
            row_count += 1

            if (
                row["protocol_version"]
                != PROTOCOL_VERSION
            ):
                raise ValueError(
                    f"Protocol mismatch at row {row_count}"
                )

            geometry = row["geometry"]
            proposer = row["proposer"]
            budget = int(row["budget"])
            escaped = int(row["escaped"])
            queries_used = int(
                row["queries_used"]
            )
            invalid_queries = int(
                row["invalid_queries"]
            )

            if geometry not in GEOMETRIES:
                raise ValueError(
                    f"Unknown geometry: {geometry}"
                )

            if proposer not in PROPOSERS:
                raise ValueError(
                    f"Unknown proposer: {proposer}"
                )

            if budget not in BUDGETS:
                raise ValueError(
                    f"Unexpected budget: {budget}"
                )

            if escaped not in (0, 1):
                raise ValueError(
                    f"Invalid escaped flag: {escaped}"
                )

            if invalid_queries > queries_used:
                raise ValueError(
                    "invalid_queries exceeds queries_used"
                )

            key = (
                geometry,
                proposer,
                budget,
            )

            interaction[key]["episodes"] += 1
            interaction[key]["escapes"] += escaped

            if escaped:
                if not row["escape_query"]:
                    raise ValueError(
                        "Escaped row missing escape_query"
                    )

                if not row[
                    "escape_invalid_query"
                ]:
                    raise ValueError(
                        "Escaped row missing "
                        "escape_invalid_query"
                    )

                escape_query = int(
                    row["escape_query"]
                )

                escape_invalid = int(
                    row["escape_invalid_query"]
                )

                if escape_query > budget:
                    raise ValueError(
                        "escape_query exceeds budget"
                    )

                if (
                    escape_invalid
                    != invalid_queries
                ):
                    raise ValueError(
                        "escape_invalid_query must "
                        "equal invalid_queries at "
                        "episode termination"
                    )

                escape_times[key][
                    "interaction"
                ].append(escape_query)

                escape_times[key][
                    "invalid"
                ].append(escape_invalid)

            if budget == MAX_BUDGET:
                hazard_key = (
                    geometry,
                    proposer,
                )

                hazard[
                    hazard_key
                ]["episodes"] += 1

                hazard[
                    hazard_key
                ]["invalid_totals"][
                    invalid_queries
                ] += 1

                if escaped:
                    hazard[
                        hazard_key
                    ]["escapes_by_invalid"][
                        int(
                            row[
                                "escape_invalid_query"
                            ]
                        )
                    ] += 1

    expected_rows = metadata.get(
        "episode_count"
    )

    if (
        expected_rows is not None
        and row_count != int(expected_rows)
    ):
        raise ValueError(
            f"Expected {expected_rows} rows, "
            f"found {row_count}"
        )

    expected_trials = int(
        metadata["trials_per_condition"]
    )

    for geometry in GEOMETRIES:
        for proposer in PROPOSERS:
            for budget in BUDGETS:
                key = (
                    geometry,
                    proposer,
                    budget,
                )

                observed = interaction[
                    key
                ]["episodes"]

                if observed != expected_trials:
                    raise ValueError(
                        f"{key} has {observed} "
                        f"episodes; expected "
                        f"{expected_trials}"
                    )

    interaction_rows = []
    q_lookup = {}

    for geometry in GEOMETRIES:
        epsilon = CALIBRATION[
            geometry
        ]["whole_space_epsilon"]

        for proposer in PROPOSERS:
            for budget in BUDGETS:
                key = (
                    geometry,
                    proposer,
                    budget,
                )

                episodes = interaction[
                    key
                ]["episodes"]

                escapes = interaction[
                    key
                ]["escapes"]

                q_value = (
                    escapes / episodes
                )

                q_lookup[key] = q_value

                interaction_rows.append({
                    "geometry": geometry,
                    "proposer": proposer,
                    "budget": budget,
                    "episodes": episodes,
                    "escapes": escapes,
                    "q_B": q_value,
                    "constant_hazard_epsilon":
                        epsilon,
                    "constant_hazard_q_B":
                        constant_hazard_escape(
                            epsilon,
                            budget,
                        ),
                })

    with paths["interaction"].open(
        "w",
        newline="",
        encoding="utf-8",
    ) as handle:
        fieldnames = list(
            interaction_rows[0].keys()
        )

        writer = csv.DictWriter(
            handle,
            fieldnames=fieldnames,
        )

        writer.writeheader()
        writer.writerows(
            interaction_rows
        )

    amplification_rows = []

    for geometry in GEOMETRIES:
        for proposer in ADAPTIVE_PROPOSERS:
            for budget in BUDGETS:
                adaptive_q = q_lookup[
                    geometry,
                    proposer,
                    budget,
                ]

                random_q = q_lookup[
                    geometry,
                    "random",
                    budget,
                ]

                if random_q == 0.0:
                    amplification = ""
                else:
                    amplification = (
                        adaptive_q
                        / random_q
                    )

                amplification_rows.append({
                    "geometry": geometry,
                    "proposer": proposer,
                    "budget": budget,
                    "q_adaptive":
                        adaptive_q,
                    "q_random":
                        random_q,
                    "amplification":
                        amplification,
                })

    with paths["amplification"].open(
        "w",
        newline="",
        encoding="utf-8",
    ) as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=list(
                amplification_rows[0].keys()
            ),
        )

        writer.writeheader()
        writer.writerows(
            amplification_rows
        )

    time_rows = []

    for geometry in GEOMETRIES:
        for proposer in PROPOSERS:
            for budget in BUDGETS:
                key = (
                    geometry,
                    proposer,
                    budget,
                )

                interaction_values = (
                    escape_times[key][
                        "interaction"
                    ]
                )

                invalid_values = (
                    escape_times[key][
                        "invalid"
                    ]
                )

                if interaction_values:
                    mean_interaction = (
                        sum(interaction_values)
                        / len(interaction_values)
                    )

                    median_interaction = median(
                        interaction_values
                    )

                    mean_invalid = (
                        sum(invalid_values)
                        / len(invalid_values)
                    )

                    median_invalid = median(
                        invalid_values
                    )
                else:
                    mean_interaction = ""
                    median_interaction = ""
                    mean_invalid = ""
                    median_invalid = ""

                time_rows.append({
                    "geometry": geometry,
                    "proposer": proposer,
                    "budget": budget,
                    "escapes":
                        len(
                            interaction_values
                        ),
                    "mean_escape_interaction":
                        mean_interaction,
                    "median_escape_interaction":
                        median_interaction,
                    "mean_escape_invalid_query":
                        mean_invalid,
                    "median_escape_invalid_query":
                        median_invalid,
                })

    with paths["time"].open(
        "w",
        newline="",
        encoding="utf-8",
    ) as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=list(
                time_rows[0].keys()
            ),
        )

        writer.writeheader()
        writer.writerows(time_rows)

    hazard_rows = []
    survival_rows = []
    hazard_points = {}

    for geometry in GEOMETRIES:
        epsilon_invalid = CALIBRATION[
            geometry
        ][
            "invalid_conditional_epsilon"
        ]

        for proposer in PROPOSERS:
            key = (
                geometry,
                proposer,
            )

            frequency = hazard[
                key
            ]["invalid_totals"]

            escapes_by_invalid = hazard[
                key
            ]["escapes_by_invalid"]

            if not frequency:
                raise ValueError(
                    f"No B=256 data for {key}"
                )

            maximum_invalid = max(
                frequency
            )

            reverse_risk = {}
            running = 0

            for t in range(
                maximum_invalid,
                0,
                -1,
            ):
                running += frequency.get(
                    t,
                    0,
                )

                reverse_risk[t] = running

            survival = 1.0
            points = []

            q_by_t = {}

            for t in range(
                1,
                maximum_invalid + 1,
            ):
                at_risk = reverse_risk[t]
                events = escapes_by_invalid.get(
                    t,
                    0,
                )

                if at_risk <= 0:
                    continue

                h_t = events / at_risk

                survival *= (
                    1.0 - h_t
                )

                q_invalid = (
                    1.0 - survival
                )

                q_by_t[t] = q_invalid

                points.append(
                    (
                        t,
                        events,
                        at_risk,
                    )
                )

                hazard_rows.append({
                    "geometry": geometry,
                    "proposer": proposer,
                    "invalid_query_index":
                        t,
                    "at_risk": at_risk,
                    "escapes": events,
                    "h_t": h_t,
                    "q_invalid":
                        q_invalid,
                    "baseline_epsilon":
                        epsilon_invalid,
                    "baseline_q_invalid":
                        constant_hazard_escape(
                            epsilon_invalid,
                            t,
                        ),
                })

            hazard_points[key] = points

            for horizon in BUDGETS:
                if horizon not in q_by_t:
                    continue

                survival_rows.append({
                    "geometry": geometry,
                    "proposer": proposer,
                    "invalid_query_horizon":
                        horizon,
                    "q_invalid":
                        q_by_t[horizon],
                    "baseline_epsilon":
                        epsilon_invalid,
                    "baseline_q_invalid":
                        constant_hazard_escape(
                            epsilon_invalid,
                            horizon,
                        ),
                })

    with paths["hazard"].open(
        "w",
        newline="",
        encoding="utf-8",
    ) as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=list(
                hazard_rows[0].keys()
            ),
        )

        writer.writeheader()
        writer.writerows(hazard_rows)

    with paths[
        "invalid_survival"
    ].open(
        "w",
        newline="",
        encoding="utf-8",
    ) as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=list(
                survival_rows[0].keys()
            ),
        )

        writer.writeheader()
        writer.writerows(
            survival_rows
        )

    h4_tests = []

    for geometry in GEOMETRIES:
        for proposer in ADAPTIVE_PROPOSERS:
            points = hazard_points[
                geometry,
                proposer,
            ]

            result = fit_grouped_logistic(
                points
            )

            result["geometry"] = geometry
            result["proposer"] = proposer
            result["alpha_level"] = ALPHA

            h4_tests.append(result)

    holm_adjust(h4_tests)

    h4_fieldnames = [
        "geometry",
        "proposer",
        "alpha",
        "beta",
        "beta_se",
        "z",
        "p_one_sided",
        "holm_p",
        "reject_h0",
        "converged",
        "total_events",
        "hazard_indices",
        "alpha_level",
    ]

    with paths["h4"].open(
        "w",
        newline="",
        encoding="utf-8",
    ) as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=h4_fieldnames,
        )

        writer.writeheader()

        for test in h4_tests:
            writer.writerow({
                key: test[key]
                for key in h4_fieldnames
            })

    summary = {
        "experiment":
            "ICTF Adaptive Gate Search",
        "protocol_version":
            PROTOCOL_VERSION,
        "source_raw":
            str(input_path),
        "source_metadata":
            str(metadata_path),
        "source_sha256":
            sha256_file(input_path),
        "rows_analyzed":
            row_count,
        "maximum_interaction_budget":
            MAX_BUDGET,
        "hazard_clock":
            "independently labeled invalid-query index",
        "h4_model":
            "logit(h_t) = alpha + beta * t",
        "h4_direction":
            "H1: beta > 0",
        "familywise_alpha":
            ALPHA,
        "multiple_testing":
            "Holm correction across four prespecified adaptive conditions",
        "h4_tests":
            h4_tests,
        "output_files": {
            name: str(path)
            for name, path
            in paths.items()
            if name != "summary"
        },
    }

    paths["summary"].write_text(
        json.dumps(
            summary,
            indent=2,
            allow_nan=True,
        ),
        encoding="utf-8",
    )

    print("ANALYSIS COMPLETE")
    print("rows =", row_count)

    for test in h4_tests:
        print(
            test["geometry"],
            test["proposer"],
            "beta=",
            test["beta"],
            "p=",
            test["p_one_sided"],
            "holm_p=",
            test["holm_p"],
            "reject=",
            test["reject_h0"],
        )

    print(
        "output_dir =",
        output_dir,
    )


def validate_config() -> None:
    print("ANALYSIS CONFIGURATION VALID")
    print("protocol_version =", PROTOCOL_VERSION)
    print(
        "hazard_cohort_budget =",
        MAX_BUDGET,
    )
    print(
        "hazard_clock = invalid-query index"
    )
    print(
        "h4_model = logit(h_t) = alpha + beta * t"
    )
    print("h4_alternative = beta > 0")
    print("familywise_alpha =", ALPHA)
    print(
        "confirmatory_conditions = 4"
    )
    print(
        "multiple_testing = Holm"
    )
    print("No result data were analyzed.")


def parse_args() -> argparse.Namespace:
    base_dir = Path(
        __file__
    ).resolve().parent

    default_input = (
        base_dir
        / "results"
        / "raw"
        / "ictf_adaptive_gate_search_raw.csv.gz"
    )

    default_output_dir = (
        base_dir
        / "results"
        / "analysis"
    )

    parser = argparse.ArgumentParser(
        description=(
            "Analyze the preregistered ICTF "
            "adaptive gate search benchmark."
        )
    )

    parser.add_argument(
        "--input",
        type=Path,
        default=default_input,
    )

    parser.add_argument(
        "--output-dir",
        type=Path,
        default=default_output_dir,
    )

    parser.add_argument(
        "--validate-config",
        action="store_true",
        help=(
            "Validate analysis configuration "
            "without reading result data."
        ),
    )

    return parser.parse_args()


def main() -> None:
    args = parse_args()

    if args.validate_config:
        validate_config()
        return

    analyze(
        input_path=args.input,
        output_dir=args.output_dir,
    )


if __name__ == "__main__":
    main()
