#!/usr/bin/env python3
"""Generate TypeScript types from Pydantic models using pydantic2ts."""

import subprocess
import sys
from pathlib import Path


def main() -> None:
    """Run pydantic2ts to generate TypeScript types."""
    project_root = Path(__file__).parent.parent
    output_path = project_root / "web" / "src" / "types" / "generated.ts"

    cmd = [
        sys.executable,
        "-m",
        "pydantic2ts",
        "--module",
        "server.models",
        "--output",
        str(output_path),
    ]

    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=project_root, capture_output=True, text=True)

    if result.returncode != 0:
        print(f"Error: {result.stderr}")
        sys.exit(1)

    print(f"Generated types at: {output_path}")
    print(result.stdout)


if __name__ == "__main__":
    main()
