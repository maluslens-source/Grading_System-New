"""Weight calculations from grade counts and lot sample weight."""

from __future__ import annotations

from typing import Optional


def calculate_weights(
    grade_a_count: int,
    grade_b_count: int,
    total_sampled_weight_g: Optional[float] = None,
    avg_apple_weight_g: Optional[float] = None,
) -> dict:
    """
    Compute Total Sampled Weight and Estimated A/B Grade Weights.

    Priority for total weight:
      1. Explicit total_sampled_weight_g from the client (lot scale reading)
      2. Else: (A + B) * avg_apple_weight_g

    Grade weights are proportional to apple counts.
    """
    total_count = grade_a_count + grade_b_count

    if total_sampled_weight_g is not None and total_sampled_weight_g > 0:
        total_weight = float(total_sampled_weight_g)
        source = "client_lot_weight"
    elif avg_apple_weight_g is not None and avg_apple_weight_g > 0 and total_count > 0:
        total_weight = float(total_count) * float(avg_apple_weight_g)
        source = "estimated_from_avg_apple_weight"
    else:
        total_weight = 0.0
        source = "unavailable"

    if total_count > 0 and total_weight > 0:
        estimated_a = round(total_weight * (grade_a_count / total_count), 2)
        estimated_b = round(total_weight * (grade_b_count / total_count), 2)
    else:
        estimated_a = 0.0
        estimated_b = 0.0

    return {
        "total_sampled_weight_g": round(total_weight, 2),
        "estimated_grade_a_weight_g": estimated_a,
        "estimated_grade_b_weight_g": estimated_b,
        "weight_source": source,
        "avg_apple_weight_g": avg_apple_weight_g,
        "grade_a_count": grade_a_count,
        "grade_b_count": grade_b_count,
        "total_count": total_count,
    }
