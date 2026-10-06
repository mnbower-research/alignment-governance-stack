"""Prospective descriptive trace analysis; no hypothesis decisions are automated."""
from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import json
import math
from collections import Counter, defaultdict
from contextlib import ExitStack
from itertools import combinations
from pathlib import Path

from environment import Proposal, g_star
from trace_run_experiment import (
    BASE,
    BOOLEAN_FIELDS,
    DEFAULT_OUTPUT,
    FIELDNAMES,
    GEOMETRIES,
    INTEGER_FIELDS,
    MAXIMUM_BUDGET,
    NULLABLE_FIELDS,
    PREFIX_BUDGETS,
    PROPOSAL_MODES,
    PROPOSERS,
    STATE_FIELDS,
    TEXT_FIELDS,
    TRIALS,
    build_gate,
    configuration,
    schema,
    stable_seed,
)


TIME_BIN_WIDTH = 16
SPATIAL_GRID = 32
DISTANCE_REFERENCE_GRID = 128

GROUPS = (
    "all_trajectories",
    "survivors_before_query",
    "previously_escaped_counterfactual",
)

STATE_METRICS = (
    "x1",
    "x2",
    "utility",
    "sigma_used",
    "push_used",
    *(
        f"{name}_{when}"
        for name in STATE_FIELDS
        for when in ("before", "after")
    ),
)


def analysis_configuration() -> dict:
    assert len(FIELDNAMES) == len(set(FIELDNAMES))
    assert (
        INTEGER_FIELDS
        | BOOLEAN_FIELDS
        | TEXT_FIELDS
    ) <= set(FIELDNAMES)
    assert NULLABLE_FIELDS <= set(FIELDNAMES)

    return {
        "schema": schema(),
        "fixed_horizon": MAXIMUM_BUDGET,
        "prefix_budgets": list(PREFIX_BUDGETS),
        "clocks": [
            "interaction",
            "invalid_query",
        ],
        "first_escape_risk_set": (
            "observed queries with escaped_previously=0, "
            "including event query"
        ),
        "invalid_clock_censoring": (
            "only episodes reaching invalid query t "
            "before first escape enter risk set t"
        ),
        "mechanism_groups": GROUPS,
        "time_bin_width": TIME_BIN_WIDTH,
        "spatial_grid": SPATIAL_GRID,
        "distance_reference_grid": DISTANCE_REFERENCE_GRID,
        "distance_proxy": (
            "Euclidean distance from spatial-bin center "
            "to nearest sampled false-admission center; "
            "not exact distance to F"
        ),
        "peak_window": (
            "highest pooled first-escape hazard over fixed "
            "16-query windows; earliest tie; descriptive, "
            "selected from data"
        ),
        "comparisons": (
            "pairwise q_B, g_k and h_t differences; "
            "q_B ratios; no significance tests"
        ),
        "hypothesis_status": (
            "H-T1 through H-T5 are not assigned "
            "supported/unsupported decisions"
        ),
        "outputs": [
            "prefix_escape.csv",
            "hazards.csv",
            "pre_invalid.csv.gz",
            "first_escape.csv.gz",
            "state_summaries.csv",
            "spatial_density.csv",
            "comparisons.csv",
            "summary.json",
        ],
    }


def parse_row(raw: dict) -> dict:
    if (
        set(raw) != set(FIELDNAMES)
        or any(value is None for value in raw.values())
    ):
        raise ValueError("Malformed CSV row")

    row = {}

    for name, value in raw.items():
        if value == "":
            if name not in NULLABLE_FIELDS:
                raise ValueError(
                    f"Required value missing: {name}"
                )
            row[name] = None

        elif name in TEXT_FIELDS:
            row[name] = value

        elif (
            name in INTEGER_FIELDS
            or name in BOOLEAN_FIELDS
        ):
            row[name] = int(value)

            if (
                name in BOOLEAN_FIELDS
                and row[name] not in (0, 1)
            ):
                raise ValueError(
                    f"Invalid boolean: {name}"
                )

        else:
            row[name] = float(value)

            if not math.isfinite(row[name]):
                raise ValueError(
                    f"Nonfinite value: {name}"
                )

    return row


def validate_episode(
    rows: list[dict],
    geometry: str,
    proposer: str,
    episode: int,
    metadata: dict,
) -> None:
    """
    Reject partial/reordered cohorts and inconsistent
    event clocks before aggregation.
    """

    if len(rows) != MAXIMUM_BUDGET:
        raise ValueError("Incomplete episode")

    first_k = None
    first_t = None
    valid = 0
    invalid = 0
    previous = None

    # Reconstruct the operational gate independently.
    # This verifies proposal -> gate score/admission,
    # rather than trusting the recorded score.
    gate = build_gate(geometry)

    for k, row in enumerate(rows, 1):
        expected = {
            "benchmark_version": (
                metadata["benchmark_version"]
            ),
            "protocol_version": (
                metadata["protocol_version"]
            ),
            "master_seed": (
                metadata["master_seed"]
            ),
            "geometry": geometry,
            "proposer": proposer,
            "episode_id": episode,
            "episode_seed": stable_seed(
                metadata["master_seed"],
                geometry,
                proposer,
                MAXIMUM_BUDGET,
                episode,
            ),
            "maximum_budget": MAXIMUM_BUDGET,
            "total_interaction_index": k,
            "prior_valid_query_count": valid,
            "prior_invalid_query_count": invalid,
            "escaped_previously": int(
                first_k is not None
            ),
        }

        for name, value in expected.items():
            if row[name] != value:
                raise ValueError(
                    f"Inconsistent {name} in "
                    f"{geometry}/{proposer}/"
                    f"{episode}/{k}"
                )

        point = Proposal(
            row["x1"],
            row["x2"],
        )

        # Independently recompute the frozen operational gate.
        expected_gate = gate.evaluate(point)

        if (
            row["gate_admitted"]
            != int(expected_gate.admitted)
        ):
            raise ValueError(
                "Recorded gate admission "
                "does not match frozen gate"
            )

        if row["gate_score"] != expected_gate.score:
            raise ValueError(
                "Recorded gate score "
                "does not match frozen gate"
            )

        truth = g_star(point)

        false_admission = bool(
            row["gate_admitted"]
            and not truth
        )

        is_first = (
            false_admission
            and first_k is None
        )

        t = (
            invalid + 1
            if not truth
            else None
        )

        if is_first:
            first_k = k
            first_t = t

        expected = {
            "utility": (
                point.x1 + point.x2
            ),
            "true_admissible": int(truth),
            "independently_invalid": int(
                not truth
            ),
            "invalid_query_index": t,
            "false_admission": int(
                false_admission
            ),
            "is_first_false_admission": int(
                is_first
            ),
            "first_escape_interaction_index": (
                first_k
            ),
            "first_escape_invalid_query_index": (
                first_t
            ),
            "feedback_admitted": (
                row["gate_admitted"]
            ),
            "feedback_score": (
                row["gate_score"]
                if proposer == "score"
                else None
            ),
        }

        if any(
            row[name] != value
            for name, value in expected.items()
        ):
            raise ValueError(
                "Inconsistent evaluation, feedback "
                "or first-escape state"
            )

        mode = row["proposal_mode"]

        if mode not in PROPOSAL_MODES:
            raise ValueError(
                "Unknown proposal mode"
            )

        if proposer in (
            "random",
            "nonadaptive",
        ):
            expected_mode = (
                "iid_random"
                if proposer == "random"
                else "nonadaptive_ranked"
            )

            unexpected_state = any(
                row[f"{name}_{when}"] is not None
                for name in STATE_FIELDS
                for when in ("before", "after")
            )

            if (
                mode != expected_mode
                or unexpected_state
            ):
                raise ValueError(
                    "Unexpected nonadaptive state"
                )

        else:
            anchor = row[
                "anchor_x1_before"
            ]

            if (
                anchor is None
                and mode != "initial_random"
            ) or (
                anchor is not None
                and mode not in (
                    "random_restart",
                    "local_search",
                )
            ):
                raise ValueError(
                    "Inconsistent adaptive "
                    "proposal mode"
                )

            for name in STATE_FIELDS:
                before = row[
                    f"{name}_before"
                ]

                expected_before = (
                    previous[f"{name}_after"]
                    if previous
                    else None
                )

                if before != expected_before:
                    raise ValueError(
                        "Discontinuous proposer state"
                    )

            if (
                row["last_admitted_after"]
                != row["feedback_admitted"]
            ):
                raise ValueError(
                    "State/feedback mismatch"
                )

            if (
                row["last_score_after"]
                != row["feedback_score"]
            ):
                raise ValueError(
                    "State/feedback mismatch"
                )

            for when in (
                "before",
                "after",
            ):
                coords = [
                    row[
                        f"{name}_{when}"
                    ]
                    for name in (
                        "anchor_x1",
                        "anchor_x2",
                        "anchor_utility",
                    )
                ]

                if any(
                    value is None
                    for value in coords
                ):
                    if not all(
                        value is None
                        for value in coords
                    ):
                        raise ValueError(
                            "Partial anchor"
                        )

                elif not (
                    0 <= coords[0] <= 1
                    and 0 <= coords[1] <= 1
                    and coords[2]
                    == coords[0] + coords[1]
                ):
                    raise ValueError(
                        "Invalid anchor"
                    )

        if mode == "local_search":
            if (
                row["sigma_used"] is None
                or row["push_used"] is None
                or row["sigma_used"] <= 0
            ):
                raise ValueError(
                    "Missing local-search parameters"
                )

        elif (
            row["sigma_used"] is not None
            or row["push_used"] is not None
        ):
            raise ValueError(
                "Unused local-search parameters "
                "must be null"
            )

        valid += int(truth)
        invalid += int(not truth)

        previous = row


def distance_lookup(
    geometry: str,
) -> dict[tuple[int, int], float | None]:
    """
    Analysis-only deterministic spatial proxy,
    never used in proposal generation.
    """

    gate = build_gate(geometry)

    centers = []

    for ix in range(
        DISTANCE_REFERENCE_GRID
    ):
        for iy in range(
            DISTANCE_REFERENCE_GRID
        ):
            point = Proposal(
                (
                    ix + 0.5
                )
                / DISTANCE_REFERENCE_GRID,
                (
                    iy + 0.5
                )
                / DISTANCE_REFERENCE_GRID,
            )

            if (
                not g_star(point)
                and gate.evaluate(
                    point
                ).admitted
            ):
                centers.append(
                    (
                        point.x1,
                        point.x2,
                    )
                )

    return {
        (ix, iy): min(
            (
                math.hypot(
                    (
                        ix + 0.5
                    )
                    / SPATIAL_GRID
                    - x,
                    (
                        iy + 0.5
                    )
                    / SPATIAL_GRID
                    - y,
                )
                for x, y in centers
            ),
            default=None,
        )
        for ix in range(SPATIAL_GRID)
        for iy in range(SPATIAL_GRID)
    }


def write_csv(
    path: Path,
    rows: list[dict],
) -> None:
    if not rows:
        raise ValueError(
            f"No schema-bearing rows "
            f"for {path.name}"
        )

    with path.open(
        "x",
        newline="",
        encoding="utf-8",
    ) as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=list(
                rows[0]
            ),
        )

        writer.writeheader()
        writer.writerows(rows)


def analyze(
    input_path: Path,
    output_dir: Path,
) -> None:
    metadata_path = input_path.with_suffix(
        ".metadata.json"
    )

    metadata = json.loads(
        metadata_path.read_text(
            encoding="utf-8"
        )
    )

    expected_configuration = configuration(
        metadata["master_seed"]
    )

    for name, value in (
        expected_configuration.items()
    ):
        if metadata.get(name) != value:
            raise ValueError(
                f"Metadata mismatch: {name}"
            )

    if (
        metadata.get("status")
        != "complete"
        or metadata.get(
            "rows_written"
        )
        != metadata[
            "maximum_possible_trace_row_count"
        ]
    ):
        raise ValueError(
            "Trace run is incomplete"
        )

    # Entire output directory is exclusive.
    # An interrupted analysis is never
    # silently reused.
    output_dir.mkdir(
        parents=True,
        exist_ok=False,
    )

    incomplete = (
        output_dir
        / "INCOMPLETE"
    )

    incomplete.write_text(
        (
            "Analysis has not completed. "
            "Do not interpret partial artifacts.\n"
        ),
        encoding="utf-8",
    )

    hazards = defaultdict(
        Counter
    )

    prefixes = Counter()

    states = defaultdict(
        lambda: [
            0,
            0.0,
            0.0,
        ]
    )

    modes = Counter()
    group_counts = Counter()
    densities = Counter()
    spatial_utility = Counter()
    no_invalid = Counter()
    row_count = 0

    identity_fields = [
        "geometry",
        "proposer",
        "episode_id",
        "episode_seed",
    ]

    pre_fields = (
        identity_fields
        + [
            "reached_first_invalid",
            "interactions_before_first_invalid",
            "valid_queries_before_first_invalid",
            "first_invalid_interaction",
        ]
        + [
            "x1",
            "x2",
            "utility",
            "proposal_mode",
            "sigma_used",
            "push_used",
            *(
                f"{name}_{when}"
                for when in (
                    "before",
                    "after",
                )
                for name in STATE_FIELDS
            ),
        ]
    )

    first_fields = (
        identity_fields
        + [
            "escaped",
            "first_escape_interaction_index",
            "first_escape_invalid_query_index",
            "total_invalid_queries",
            "subsequent_false_admissions_counterfactual",
        ]
    )

    with ExitStack() as stack:
        source = stack.enter_context(
            gzip.open(
                input_path,
                "rt",
                newline="",
                encoding="utf-8",
            )
        )

        reader = csv.DictReader(
            source
        )

        if reader.fieldnames != list(
            FIELDNAMES
        ):
            raise ValueError(
                "Trace schema/order mismatch"
            )

        writers = []

        for name, fields in (
            (
                "pre_invalid.csv.gz",
                pre_fields,
            ),
            (
                "first_escape.csv.gz",
                first_fields,
            ),
        ):
            handle = stack.enter_context(
                gzip.open(
                    output_dir / name,
                    "xt",
                    newline="",
                    encoding="utf-8",
                )
            )

            writer = csv.DictWriter(
                handle,
                fieldnames=fields,
            )

            writer.writeheader()
            writers.append(writer)

        (
            pre_writer,
            first_writer,
        ) = writers

        for geometry in GEOMETRIES:
            for proposer in PROPOSERS:
                condition = (
                    geometry,
                    proposer,
                )

                for episode in range(
                    TRIALS
                ):
                    rows = []

                    for _ in range(
                        MAXIMUM_BUDGET
                    ):
                        raw = next(
                            reader,
                            None,
                        )

                        if raw is None:
                            raise ValueError(
                                "Truncated cohort"
                            )

                        rows.append(
                            parse_row(raw)
                        )

                    validate_episode(
                        rows,
                        geometry,
                        proposer,
                        episode,
                        metadata,
                    )

                    row_count += len(rows)

                    final = rows[-1]

                    first_k = final[
                        "first_escape_interaction_index"
                    ]

                    identity = {
                        name: final[name]
                        for name
                        in identity_fields
                    }

                    first_invalid = next(
                        (
                            row
                            for row in rows
                            if row[
                                "independently_invalid"
                            ]
                        ),
                        None,
                    )

                    pre = {
                        name: None
                        for name in pre_fields
                    }

                    pre.update(
                        identity,
                        reached_first_invalid=int(
                            first_invalid
                            is not None
                        ),
                    )

                    if first_invalid:
                        pre.update(
                            {
                                name: first_invalid[
                                    name
                                ]
                                for name
                                in pre_fields
                                if name
                                in first_invalid
                            }
                        )

                        pre.update(
                            interactions_before_first_invalid=(
                                first_invalid[
                                    "total_interaction_index"
                                ]
                                - 1
                            ),
                            valid_queries_before_first_invalid=(
                                first_invalid[
                                    "prior_valid_query_count"
                                ]
                            ),
                            first_invalid_interaction=(
                                first_invalid[
                                    "total_interaction_index"
                                ]
                            ),
                        )

                    else:
                        no_invalid[
                            condition
                        ] += 1

                    pre_writer.writerow(
                        pre
                    )

                    first_writer.writerow(
                        {
                            **identity,
                            "escaped": int(
                                first_k
                                is not None
                            ),
                            "first_escape_interaction_index": (
                                first_k
                            ),
                            "first_escape_invalid_query_index": (
                                final[
                                    "first_escape_invalid_query_index"
                                ]
                            ),
                            "total_invalid_queries": (
                                final[
                                    "prior_invalid_query_count"
                                ]
                                + final[
                                    "independently_invalid"
                                ]
                            ),
                            "subsequent_false_admissions_counterfactual": (
                                sum(
                                    row[
                                        "false_admission"
                                    ]
                                    for row
                                    in rows
                                )
                                - int(
                                    first_k
                                    is not None
                                )
                            ),
                        }
                    )

                    for budget in (
                        PREFIX_BUDGETS
                    ):
                        prefixes[
                            (
                                *condition,
                                budget,
                            )
                        ] += int(
                            first_k
                            is not None
                            and first_k
                            <= budget
                        )

                    for row in rows:
                        groups = (
                            GROUPS[0],
                            (
                                GROUPS[2]
                                if row[
                                    "escaped_previously"
                                ]
                                else GROUPS[1]
                            ),
                        )

                        clocks = [
                            (
                                "interaction",
                                row[
                                    "total_interaction_index"
                                ],
                            )
                        ]

                        if row[
                            "independently_invalid"
                        ]:
                            clocks.append(
                                (
                                    "invalid_query",
                                    row[
                                        "invalid_query_index"
                                    ],
                                )
                            )

                        for (
                            clock,
                            index,
                        ) in clocks:
                            key = (
                                *condition,
                                clock,
                                index,
                            )

                            if not row[
                                "escaped_previously"
                            ]:
                                hazards[key][
                                    "at_risk"
                                ] += 1

                                hazards[key][
                                    "events"
                                ] += row[
                                    "is_first_false_admission"
                                ]

                            for group in groups:
                                state_key = (
                                    *key,
                                    group,
                                )

                                group_counts[
                                    state_key
                                ] += 1

                                modes[
                                    (
                                        *state_key,
                                        row[
                                            "proposal_mode"
                                        ],
                                    )
                                ] += 1

                                for metric in (
                                    STATE_METRICS
                                ):
                                    value = row[
                                        metric
                                    ]

                                    if (
                                        value
                                        is not None
                                    ):
                                        acc = states[
                                            (
                                                *state_key,
                                                metric,
                                            )
                                        ]

                                        acc[0] += 1
                                        acc[1] += (
                                            value
                                        )
                                        acc[2] += (
                                            value
                                            * value
                                        )

                                ix = min(
                                    int(
                                        row["x1"]
                                        * SPATIAL_GRID
                                    ),
                                    SPATIAL_GRID - 1,
                                )

                                iy = min(
                                    int(
                                        row["x2"]
                                        * SPATIAL_GRID
                                    ),
                                    SPATIAL_GRID - 1,
                                )

                                spatial_key = (
                                    *condition,
                                    clock,
                                    (
                                        index - 1
                                    )
                                    // TIME_BIN_WIDTH,
                                    group,
                                    ix,
                                    iy,
                                )

                                densities[
                                    spatial_key
                                ] += 1

                                spatial_utility[
                                    spatial_key
                                ] += row[
                                    "utility"
                                ]

        if next(
            reader,
            None,
        ) is not None:
            raise ValueError(
                "Unexpected extra trace rows"
            )

    prefix_rows = [
        {
            "geometry": geometry,
            "proposer": proposer,
            "budget": budget,
            "episodes": TRIALS,
            "first_escapes": prefixes[
                geometry,
                proposer,
                budget,
            ],
            "q_B": (
                prefixes[
                    geometry,
                    proposer,
                    budget,
                ]
                / TRIALS
            ),
        }
        for geometry in GEOMETRIES
        for proposer in PROPOSERS
        for budget in PREFIX_BUDGETS
    ]

    hazard_rows = []

    windows = defaultdict(
        Counter
    )

    for geometry in GEOMETRIES:
        for proposer in PROPOSERS:
            for clock in (
                "interaction",
                "invalid_query",
            ):
                for index in range(
                    1,
                    MAXIMUM_BUDGET + 1,
                ):
                    counts = hazards[
                        geometry,
                        proposer,
                        clock,
                        index,
                    ]

                    n = counts[
                        "at_risk"
                    ]

                    events = counts[
                        "events"
                    ]

                    hazard_rows.append(
                        dict(
                            geometry=geometry,
                            proposer=proposer,
                            clock=clock,
                            index=index,
                            at_risk=n,
                            first_escapes=events,
                            hazard=(
                                events / n
                                if n
                                else None
                            ),
                        )
                    )

                    window = windows[
                        geometry,
                        proposer,
                        clock,
                        (
                            index - 1
                        )
                        // TIME_BIN_WIDTH,
                    ]

                    window[
                        "at_risk"
                    ] += n

                    window[
                        "events"
                    ] += events

    peaks = {}

    for geometry in GEOMETRIES:
        for proposer in PROPOSERS:
            for clock in (
                "interaction",
                "invalid_query",
            ):
                eligible = [
                    (
                        window,
                        windows[
                            geometry,
                            proposer,
                            clock,
                            window,
                        ],
                    )
                    for window in range(
                        MAXIMUM_BUDGET
                        // TIME_BIN_WIDTH
                    )
                    if windows[
                        geometry,
                        proposer,
                        clock,
                        window,
                    ]["at_risk"]
                ]

                if (
                    eligible
                    and any(
                        counts["events"]
                        for _,
                        counts
                        in eligible
                    )
                ):
                    peaks[
                        geometry,
                        proposer,
                        clock,
                    ] = max(
                        eligible,
                        key=lambda item: (
                            item[1]["events"]
                            / item[1][
                                "at_risk"
                            ]
                        ),
                    )[0]

                else:
                    peaks[
                        geometry,
                        proposer,
                        clock,
                    ] = None

    state_rows = []

    for (
        key,
        n,
    ) in sorted(
        group_counts.items()
    ):
        (
            geometry,
            proposer,
            clock,
            index,
            group,
        ) = key

        for metric in STATE_METRICS:
            (
                count,
                total,
                square,
            ) = states[
                (
                    *key,
                    metric,
                )
            ]

            state_rows.append(
                dict(
                    geometry=geometry,
                    proposer=proposer,
                    clock=clock,
                    index=index,
                    group=group,
                    metric=metric,
                    query_count=n,
                    nonnull_count=count,
                    mean=(
                        total / count
                        if count
                        else None
                    ),
                    population_sd=(
                        math.sqrt(
                            max(
                                0,
                                (
                                    square
                                    / count
                                )
                                - (
                                    total
                                    / count
                                )
                                ** 2,
                            )
                        )
                        if count
                        else None
                    ),
                )
            )

        for mode in PROPOSAL_MODES:
            count = modes[
                (
                    *key,
                    mode,
                )
            ]

            fraction = (
                count / n
            )

            state_rows.append(
                dict(
                    geometry=geometry,
                    proposer=proposer,
                    clock=clock,
                    index=index,
                    group=group,
                    metric=(
                        f"mode_fraction:"
                        f"{mode}"
                    ),
                    query_count=n,
                    nonnull_count=n,
                    mean=fraction,
                    population_sd=(
                        math.sqrt(
                            fraction
                            * (
                                1
                                - fraction
                            )
                        )
                    ),
                )
            )

    distances = {
        geometry: distance_lookup(
            geometry
        )
        for geometry in GEOMETRIES
    }

    spatial_totals = Counter()

    for (
        key,
        n,
    ) in densities.items():
        spatial_totals[
            key[:5]
        ] += n

    spatial_rows = []

    for (
        (
            geometry,
            proposer,
            clock,
            window,
            group,
            ix,
            iy,
        ),
        n,
    ) in sorted(
        densities.items()
    ):
        peak = peaks[
            geometry,
            proposer,
            clock,
        ]

        if peak is None:
            phase = (
                "no_first_escape_events"
            )
        elif window < peak:
            phase = "before"
        elif window > peak:
            phase = "after"
        else:
            phase = "peak_window"

        spatial_rows.append(
            dict(
                geometry=geometry,
                proposer=proposer,
                clock=clock,
                time_window=window,
                index_start=(
                    window
                    * TIME_BIN_WIDTH
                    + 1
                ),
                index_end=(
                    (
                        window + 1
                    )
                    * TIME_BIN_WIDTH
                ),
                group=group,
                x_bin=ix,
                y_bin=iy,
                query_count=n,
                density_fraction=(
                    n
                    / spatial_totals[
                        geometry,
                        proposer,
                        clock,
                        window,
                        group,
                    ]
                ),
                mean_utility=(
                    spatial_utility[
                        geometry,
                        proposer,
                        clock,
                        window,
                        group,
                        ix,
                        iy,
                    ]
                    / n
                ),
                distance_to_sampled_false_region_proxy=(
                    distances[
                        geometry
                    ][
                        ix,
                        iy,
                    ]
                ),
                descriptive_peak_window=(
                    peak
                ),
                relative_to_descriptive_peak=(
                    phase
                ),
            )
        )

    comparisons = []

    conditions = [
        (
            geometry,
            proposer,
        )
        for geometry in GEOMETRIES
        for proposer in PROPOSERS
    ]

    for left, right in combinations(
        conditions,
        2,
    ):
        comparison_specs = (
            (
                "q_B",
                "interaction",
                PREFIX_BUDGETS,
            ),
            (
                "g_k",
                "interaction",
                range(
                    1,
                    MAXIMUM_BUDGET + 1,
                ),
            ),
            (
                "h_t",
                "invalid_query",
                range(
                    1,
                    MAXIMUM_BUDGET + 1,
                ),
            ),
        )

        for (
            metric,
            clock,
            indices,
        ) in comparison_specs:
            for index in indices:
                values = []

                for condition in (
                    left,
                    right,
                ):
                    counts = hazards[
                        *condition,
                        clock,
                        index,
                    ]

                    if metric == "q_B":
                        value = (
                            prefixes[
                                *condition,
                                index,
                            ]
                            / TRIALS
                        )

                    elif counts[
                        "at_risk"
                    ]:
                        value = (
                            counts[
                                "events"
                            ]
                            / counts[
                                "at_risk"
                            ]
                        )

                    else:
                        value = None

                    values.append(
                        value
                    )

                (
                    left_value,
                    right_value,
                ) = values

                comparisons.append(
                    dict(
                        left_geometry=(
                            left[0]
                        ),
                        left_proposer=(
                            left[1]
                        ),
                        right_geometry=(
                            right[0]
                        ),
                        right_proposer=(
                            right[1]
                        ),
                        metric=metric,
                        clock=clock,
                        index=index,
                        left_value=(
                            left_value
                        ),
                        right_value=(
                            right_value
                        ),
                        difference=(
                            left_value
                            - right_value
                            if (
                                left_value
                                is not None
                                and right_value
                                is not None
                            )
                            else None
                        ),
                        ratio=(
                            left_value
                            / right_value
                            if (
                                metric
                                == "q_B"
                                and left_value
                                is not None
                                and right_value
                            )
                            else None
                        ),
                    )
                )

    for (
        name,
        rows,
    ) in (
        (
            "prefix_escape.csv",
            prefix_rows,
        ),
        (
            "hazards.csv",
            hazard_rows,
        ),
        (
            "state_summaries.csv",
            state_rows,
        ),
        (
            "spatial_density.csv",
            spatial_rows,
        ),
        (
            "comparisons.csv",
            comparisons,
        ),
    ):
        write_csv(
            output_dir / name,
            rows,
        )

    digest = hashlib.sha256()

    with input_path.open(
        "rb"
    ) as handle:
        for block in iter(
            lambda: handle.read(
                1024 * 1024
            ),
            b"",
        ):
            digest.update(
                block
            )

    summary = {
        "analysis_configuration": (
            analysis_configuration()
        ),
        "source": str(
            input_path.resolve()
        ),
        "source_sha256": (
            digest.hexdigest()
        ),
        "source_metadata": metadata,
        "rows_analyzed": row_count,
        "status": "complete",
        "episodes_without_invalid_query": [
            {
                "geometry": geometry,
                "proposer": proposer,
                "count": no_invalid[
                    geometry,
                    proposer,
                ],
            }
            for geometry in GEOMETRIES
            for proposer in PROPOSERS
        ],
    }

    with (
        output_dir
        / "summary.json"
    ).open(
        "x",
        encoding="utf-8",
    ) as handle:
        json.dump(
            summary,
            handle,
            indent=2,
            allow_nan=False,
        )

    incomplete.unlink()

    print(
        "TRACE ANALYSIS COMPLETE: "
        f"{row_count} rows; "
        "descriptive summaries only"
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__
    )

    parser.add_argument(
        "--validate-config",
        action="store_true",
    )

    parser.add_argument(
        "--input",
        type=Path,
        default=DEFAULT_OUTPUT,
    )

    parser.add_argument(
        "--output-dir",
        type=Path,
        default=(
            BASE
            / "results"
            / "trace_benchmark_001"
            / "analysis"
        ),
    )

    args = parser.parse_args()

    if args.validate_config:
        print(
            "TRACE ANALYSIS "
            "CONFIGURATION VALID"
        )

        print(
            json.dumps(
                analysis_configuration(),
                indent=2,
                allow_nan=False,
            )
        )

        print(
            "No result data read or analyzed; "
            "no output created."
        )

        return

    analyze(
        args.input,
        args.output_dir,
    )


if __name__ == "__main__":
    main()