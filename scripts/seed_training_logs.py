#!/usr/bin/env python3
"""Seed initial training data from search logs."""

import argparse
import json
from pathlib import Path
from datetime import datetime


def seed_from_logs(logs_path: str, output_path: str) -> None:
    """Extract training signals from search logs."""
    logs = Path(logs_path)
    if not logs.exists():
        print(f"No logs found at {logs_path}, creating empty seed file")
        with open(output_path, "w") as f:
            json.dump([], f)
        return

    with open(logs_path) as f:
        log_entries = json.load(f)

    training_data = []
    for entry in log_entries:
        if entry.get("clicked_chunk"):
            training_data.append({
                "query": entry["query"],
                "positive": entry["clicked_chunk"],
                "negatives": [c for c in entry.get("results", [])[:5] if c != entry["clicked_chunk"]],
                "timestamp": entry.get("timestamp", datetime.utcnow().isoformat()),
            })

    with open(output_path, "w") as f:
        json.dump(training_data, f, indent=2)

    print(f"Seeded {len(training_data)} training examples from {len(log_entries)} log entries")


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed training data from logs")
    parser.add_argument("--logs", default="data/search_logs.json", help="Search logs path")
    parser.add_argument("--output", default="data/training_seed.json", help="Output path")
    args = parser.parse_args()

    seed_from_logs(args.logs, args.output)


if __name__ == "__main__":
    main()
