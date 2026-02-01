"""FastMCP server construction for TriBridRAG."""

from __future__ import annotations

from functools import lru_cache

from mcp.server.fastmcp import FastMCP

from server.config import load_config
from server.mcp.tools import register_mcp_tools


@lru_cache(maxsize=1)
def get_mcp_server() -> FastMCP:
    """Return the process-wide FastMCP server singleton."""
    cfg = load_config()
    mcp_cfg = cfg.mcp

    mcp = FastMCP(
        "TriBridRAG",
        instructions="Tri-brid RAG system with vector, sparse, and graph retrieval.",
        stateless_http=bool(mcp_cfg.stateless_http),
        json_response=bool(mcp_cfg.json_response),
        # We mount this ASGI app under cfg.mcp.mount_path, so the internal MCP endpoint path
        # must be "/" (otherwise we'd end up with /mcp/mcp).
        streamable_http_path="/",
    )

    register_mcp_tools(mcp, mcp_cfg)
    return mcp

