#!/usr/bin/env python3
"""Promote a trained reranker model to production."""

import argparse
import shutil
from pathlib import Path


def promote_model(source_path: str, target_path: str) -> None:
    """Copy trained model to production location."""
    source = Path(source_path)
    target = Path(target_path)

    if not source.exists():
        raise FileNotFoundError(f"Source model not found: {source}")

    # Backup existing model if present
    if target.exists():
        backup_path = target.parent / f"{target.name}.backup"
        print(f"Backing up existing model to {backup_path}")
        if backup_path.exists():
            shutil.rmtree(backup_path)
        shutil.move(str(target), str(backup_path))

    # Copy new model
    print(f"Promoting model from {source} to {target}")
    shutil.copytree(str(source), str(target))
    print("Model promoted successfully")


def main() -> None:
    parser = argparse.ArgumentParser(description="Promote trained reranker model")
    parser.add_argument("--source", required=True, help="Path to trained model")
    parser.add_argument(
        "--target",
        default="models/cross-encoder-tribrid",
        help="Production model path",
    )
    args = parser.parse_args()

    promote_model(args.source, args.target)


if __name__ == "__main__":
    main()
