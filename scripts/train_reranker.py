#!/usr/bin/env python3
"""Train a cross-encoder reranker model on triplet data."""

import argparse
import json
from pathlib import Path

from sentence_transformers import CrossEncoder, InputExample
from sentence_transformers.cross_encoder.evaluation import CERerankingEvaluator
from torch.utils.data import DataLoader


def load_triplets(triplets_path: str) -> list[InputExample]:
    """Load triplets and convert to InputExamples."""
    with open(triplets_path) as f:
        triplets = json.load(f)

    examples = []
    for t in triplets:
        # Positive pair
        examples.append(InputExample(texts=[t["query"], t["positive"]], label=1.0))
        # Negative pair
        examples.append(InputExample(texts=[t["query"], t["negative"]], label=0.0))

    return examples


def train_reranker(
    triplets_path: str,
    base_model: str,
    output_path: str,
    epochs: int = 3,
    batch_size: int = 16,
) -> None:
    """Train the cross-encoder reranker."""
    print(f"Loading triplets from {triplets_path}")
    examples = load_triplets(triplets_path)
    print(f"Loaded {len(examples)} training examples")

    print(f"Initializing model from {base_model}")
    model = CrossEncoder(base_model, num_labels=1, max_length=512)

    train_dataloader = DataLoader(examples, shuffle=True, batch_size=batch_size)

    print(f"Training for {epochs} epochs...")
    model.fit(
        train_dataloader=train_dataloader,
        epochs=epochs,
        warmup_steps=100,
        show_progress_bar=True,
    )

    output_dir = Path(output_path)
    output_dir.mkdir(parents=True, exist_ok=True)
    model.save(str(output_dir))
    print(f"Model saved to {output_dir}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Train cross-encoder reranker")
    parser.add_argument("--triplets", required=True, help="Path to triplets JSON")
    parser.add_argument(
        "--base-model",
        default="cross-encoder/ms-marco-MiniLM-L-6-v2",
        help="Base model to fine-tune",
    )
    parser.add_argument(
        "--output",
        default="models/cross-encoder-tribrid",
        help="Output directory for trained model",
    )
    parser.add_argument("--epochs", type=int, default=3, help="Training epochs")
    parser.add_argument("--batch-size", type=int, default=16, help="Batch size")
    args = parser.parse_args()

    train_reranker(
        args.triplets,
        args.base_model,
        args.output,
        args.epochs,
        args.batch_size,
    )


if __name__ == "__main__":
    main()
