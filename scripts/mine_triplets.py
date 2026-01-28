#!/usr/bin/env python3
"""Mine training triplets from evaluation results for reranker training."""

import argparse
import json
from pathlib import Path


def mine_triplets(eval_results_path: str, output_path: str) -> None:
    """Extract triplets from evaluation results.

    Creates (query, positive, negative) triplets where:
    - positive: chunks that were expected and retrieved
    - negative: chunks that were retrieved but not expected
    """
    with open(eval_results_path) as f:
        eval_data = json.load(f)

    triplets = []

    for result in eval_data.get("results", []):
        query = result["question"]
        expected = set(result["expected_chunks"])
        retrieved = result["retrieved_chunks"]

        positives = [c for c in retrieved if c in expected]
        negatives = [c for c in retrieved if c not in expected]

        for pos in positives:
            for neg in negatives:
                triplets.append({
                    "query": query,
                    "positive": pos,
                    "negative": neg,
                })

    with open(output_path, "w") as f:
        json.dump(triplets, f, indent=2)

    print(f"Mined {len(triplets)} triplets from {len(eval_data.get('results', []))} results")
    print(f"Saved to: {output_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Mine triplets from eval results")
    parser.add_argument("--eval-results", required=True, help="Path to eval results JSON")
    parser.add_argument("--output", required=True, help="Output path for triplets JSON")
    args = parser.parse_args()

    mine_triplets(args.eval_results, args.output)


if __name__ == "__main__":
    main()
