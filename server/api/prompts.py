from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from server.models.tribrid_config_model import CorpusScope, SystemPromptsConfig, TriBridConfig
from server.services.config_store import CorpusNotFoundError
from server.services.config_store import get_config as load_scoped_config
from server.services.config_store import save_config as save_scoped_config

router = APIRouter(tags=["prompts"])


class PromptMetadata(BaseModel):
    label: str = Field(description="Human-friendly label")
    description: str = Field(description="What this prompt is used for")
    category: str = Field(description="Prompt category (chat/retrieval/indexing/evaluation)")


class PromptsResponse(BaseModel):
    prompts: dict[str, str] = Field(default_factory=dict, description="Prompt key -> value")
    metadata: dict[str, PromptMetadata] = Field(default_factory=dict, description="Prompt key -> metadata")


class PromptUpdateRequest(BaseModel):
    value: str = Field(description="New prompt value")


def _title(s: str) -> str:
    return " ".join([p.capitalize() for p in s.replace("_", " ").split()])


def _build_prompts_payload(cfg: TriBridConfig) -> PromptsResponse:
    """Expose a curated set of prompts for the UI editor.

    Keys are stable strings used by the frontend:
    - system prompts: "query_expansion", "query_rewrite", "eval_analysis", ...
    - chat prompts: "chat.system_prompt_direct", ...
    """

    prompts: dict[str, str] = {}
    meta: dict[str, PromptMetadata] = {}

    sp = cfg.system_prompts
    sp_fields = SystemPromptsConfig.model_fields

    def add_system_prompt(key: str, category: str, label: str | None = None) -> None:
        if key not in sp_fields:
            return
        prompts[key] = str(getattr(sp, key) or "")
        meta[key] = PromptMetadata(
            label=label or _title(key),
            description=str(sp_fields[key].description or ""),
            category=category,
        )

    # Retrieval / evaluation prompts (used directly in the pipeline)
    add_system_prompt("query_expansion", category="retrieval", label="Query Expansion")
    add_system_prompt("query_rewrite", category="retrieval", label="Query Rewrite")
    add_system_prompt("eval_analysis", category="evaluation", label="Eval Analysis")

    # Indexing prompts (LLM-assisted metadata extraction)
    add_system_prompt("semantic_chunk_summaries", category="indexing", label="Semantic Chunk Summaries")
    add_system_prompt("lightweight_chunk_summaries", category="indexing", label="Lightweight Chunk Summaries")
    add_system_prompt("code_enrichment", category="indexing", label="Code Enrichment")
    add_system_prompt("semantic_kg_extraction", category="indexing", label="Semantic KG Extraction")

    # Chat-level prompts (read-only here; edited in Chat Settings)
    chat = cfg.chat
    chat_prompts: list[tuple[str, str]] = [
        ("system_prompt_direct", "Direct (no context)"),
        ("system_prompt_rag", "RAG only"),
        ("system_prompt_recall", "Recall only"),
        ("system_prompt_rag_and_recall", "RAG + Recall"),
    ]
    for field, label in chat_prompts:
        key = f"chat.{field}"
        prompts[key] = str(getattr(chat, field, "") or "")
        meta[key] = PromptMetadata(
            label=label,
            description=f"Chat prompt: {field}",
            category="chat",
        )

    return PromptsResponse(prompts=prompts, metadata=meta)


def _set_prompt_value(cfg: TriBridConfig, prompt_key: str, value: str) -> TriBridConfig:
    """Mutate cfg in-place for a supported prompt key."""
    if prompt_key.startswith("chat."):
        field = prompt_key.split(".", 1)[1].strip()
        if field not in cfg.chat.model_fields:
            raise KeyError(prompt_key)
        setattr(cfg.chat, field, value)
        return cfg

    if prompt_key in cfg.system_prompts.model_fields:
        setattr(cfg.system_prompts, prompt_key, value)
        return cfg

    raise KeyError(prompt_key)


def _default_value_for(prompt_key: str) -> str:
    """Return the LAW default for a prompt key."""
    default_cfg = TriBridConfig()
    if prompt_key.startswith("chat."):
        field = prompt_key.split(".", 1)[1].strip()
        return str(getattr(default_cfg.chat, field, "") or "")
    return str(getattr(default_cfg.system_prompts, prompt_key, "") or "")


@router.get("/prompts", response_model=PromptsResponse)
async def list_prompts(scope: CorpusScope = Depends()) -> PromptsResponse:
    try:
        cfg = await load_scoped_config(repo_id=scope.resolved_repo_id)
        return _build_prompts_payload(cfg)
    except CorpusNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.put("/prompts/{prompt_key}", response_model=PromptsResponse)
async def update_prompt(
    prompt_key: str,
    body: PromptUpdateRequest,
    scope: CorpusScope = Depends(),
) -> PromptsResponse:
    key = (prompt_key or "").strip()
    try:
        cfg = await load_scoped_config(repo_id=scope.resolved_repo_id)
        _set_prompt_value(cfg, key, body.value)
        saved = await save_scoped_config(cfg, repo_id=scope.resolved_repo_id)
        return _build_prompts_payload(saved)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Unknown prompt key: {key}")
    except CorpusNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/prompts/reset/{prompt_key}", response_model=PromptsResponse)
async def reset_prompt(
    prompt_key: str,
    scope: CorpusScope = Depends(),
) -> PromptsResponse:
    key = (prompt_key or "").strip()
    try:
        cfg = await load_scoped_config(repo_id=scope.resolved_repo_id)
        _set_prompt_value(cfg, key, _default_value_for(key))
        saved = await save_scoped_config(cfg, repo_id=scope.resolved_repo_id)
        return _build_prompts_payload(saved)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Unknown prompt key: {key}")
    except CorpusNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

