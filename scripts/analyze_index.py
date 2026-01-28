#!/usr/bin/env python3
"""Analyze index statistics and quality."""

import argparse
import asyncio
import json

import asyncpg


async def analyze_index(connection_string: str, repo_id: str) -> dict:
    """Analyze index for a repository."""
    conn = await asyncpg.connect(connection_string)

    try:
        # Get chunk statistics
        chunk_stats = await conn.fetchrow(
            """
            SELECT
                COUNT(*) as total_chunks,
                AVG(token_count) as avg_tokens,
                MIN(token_count) as min_tokens,
                MAX(token_count) as max_tokens,
                COUNT(DISTINCT file_path) as total_files
            FROM chunks WHERE repo_id = $1
            """,
            repo_id,
        )

        # Get language breakdown
        language_breakdown = await conn.fetch(
            """
            SELECT language, COUNT(*) as count
            FROM chunks WHERE repo_id = $1
            GROUP BY language ORDER BY count DESC
            """,
            repo_id,
        )

        # Get file extension breakdown
        ext_breakdown = await conn.fetch(
            """
            SELECT
                SUBSTRING(file_path FROM '\\.([^.]+)$') as ext,
                COUNT(*) as count
            FROM chunks WHERE repo_id = $1
            GROUP BY ext ORDER BY count DESC
            """,
            repo_id,
        )

        results = {
            "repo_id": repo_id,
            "total_chunks": chunk_stats["total_chunks"],
            "total_files": chunk_stats["total_files"],
            "token_stats": {
                "avg": float(chunk_stats["avg_tokens"] or 0),
                "min": chunk_stats["min_tokens"],
                "max": chunk_stats["max_tokens"],
            },
            "by_language": {r["language"]: r["count"] for r in language_breakdown},
            "by_extension": {r["ext"]: r["count"] for r in ext_breakdown if r["ext"]},
        }

        print(json.dumps(results, indent=2))
        return results

    finally:
        await conn.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Analyze index statistics")
    parser.add_argument("--repo-id", required=True, help="Repository ID")
    parser.add_argument(
        "--db",
        default="postgresql://postgres:postgres@localhost:5432/tribrid_rag",
        help="Database connection string",
    )
    args = parser.parse_args()

    asyncio.run(analyze_index(args.db, args.repo_id))


if __name__ == "__main__":
    main()
