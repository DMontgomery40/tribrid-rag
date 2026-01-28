#!/usr/bin/env python3
"""Backend smoke tests."""

import asyncio
import httpx
import sys


async def test_health(base_url: str) -> bool:
    """Test health endpoint."""
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(f"{base_url}/health")
            return resp.status_code == 200
        except Exception as e:
            print(f"Health check failed: {e}")
            return False


async def test_config(base_url: str) -> bool:
    """Test config endpoint."""
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(f"{base_url}/config")
            if resp.status_code != 200:
                return False
            config = resp.json()
            return "embedding" in config and "fusion" in config
        except Exception as e:
            print(f"Config check failed: {e}")
            return False


async def main() -> None:
    base_url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
    print(f"Testing backend at {base_url}")

    tests = [
        ("Health", test_health),
        ("Config", test_config),
    ]

    results = []
    for name, test_fn in tests:
        print(f"Testing {name}...", end=" ")
        passed = await test_fn(base_url)
        results.append((name, passed))
        print("PASS" if passed else "FAIL")

    print("\n=== Results ===")
    for name, passed in results:
        status = "PASS" if passed else "FAIL"
        print(f"  {name}: {status}")

    all_passed = all(p for _, p in results)
    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    asyncio.run(main())
