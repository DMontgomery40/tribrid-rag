from __future__ import annotations

from server.training.mlx_qwen3_trainer import accumulate_grads, average_grads


def _simulate_effective_updates(micro_grads: list[dict[str, float]], accum_steps: int) -> list[dict[str, float]]:
    updates: list[dict[str, float]] = []
    accumulated = None
    micro_count = 0

    for g in micro_grads:
        accumulated = accumulate_grads(accumulated, g)
        micro_count += 1

        if micro_count < accum_steps:
            continue

        updates.append(average_grads(accumulated, steps=micro_count))
        accumulated = None
        micro_count = 0

    if micro_count > 0 and accumulated is not None:
        updates.append(average_grads(accumulated, steps=micro_count))

    return updates


def test_grad_accumulation_applies_single_update_per_effective_step() -> None:
    micros = [
        {"w": 1.0, "b": 2.0},
        {"w": 3.0, "b": 4.0},
        {"w": 5.0, "b": 6.0},
        {"w": 7.0, "b": 8.0},
        {"w": 9.0, "b": 10.0},
        {"w": 11.0, "b": 12.0},
        {"w": 13.0, "b": 14.0},
    ]
    updates = _simulate_effective_updates(micros, accum_steps=3)

    # 7 micro-batches with accum=3 -> 3 effective optimizer updates.
    assert len(updates) == 3

    # Update 1: avg of micro 1..3
    assert updates[0]["w"] == (1.0 + 3.0 + 5.0) / 3.0
    assert updates[0]["b"] == (2.0 + 4.0 + 6.0) / 3.0

    # Update 2: avg of micro 4..6
    assert updates[1]["w"] == (7.0 + 9.0 + 11.0) / 3.0
    assert updates[1]["b"] == (8.0 + 10.0 + 12.0) / 3.0

    # Update 3: avg of remainder (micro 7 only)
    assert updates[2]["w"] == 13.0
    assert updates[2]["b"] == 14.0
