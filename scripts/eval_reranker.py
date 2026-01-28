#!/usr/bin/env python3
"""Evaluate reranker model performance."""

import argparse
import json
from pathlib import Path

from sentence_transformers import CrossEncoder


def evaluate_reranker(model_path: str, test_data_path: str) -> dict:
    """Evaluate reranker on test data."""
    print(f"Loading model from {model_path}")
    model = CrossEncoder(model_path)

    print(f"Loading test data from {test_data_path}")
    with open(test_data_path) as f:
        test_data = json.load(f)

    correct = 0
    total = 0

    for item in test_data:
        query = item["query"]
        positive = item["positive"]
        negative = item["negative"]

        pos_score = model.predict([[query, positive]])[0]
        neg_score = model.predict([[query, negative]])[0]

        if pos_score > neg_score:
            correct += 1
        total += 1

    accuracy = correct / total if total > 0 else 0

    results = {
        "accuracy": accuracy,
        "correct": correct,
        "total": total,
        "model_path": model_path,
    }

    print(f"\nResults:")
    print(f"  Accuracy: {accuracy:.2%}")
    print(f"  Correct: {correct}/{total}")

    return results


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate reranker model")
    parser.add_argument("--model", required=True, help="Path to model")
    parser.add_argument("--test-data", required=True, help="Path to test triplets JSON")
    parser.add_argument("--output", help="Output path for results JSON")
    args = parser.parse_args()

    results = evaluate_reranker(args.model, args.test_data)

    if args.output:
        with open(args.output, "w") as f:
            json.dump(results, f, indent=2)
        print(f"\nResults saved to {args.output}")


if __name__ == "__main__":
    main()
