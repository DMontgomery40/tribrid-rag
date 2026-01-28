"""Pydantic models for tribrid_config.json validation and type safety.

This module defines the schema for tunable RAG parameters stored in tribrid_config.json.
Using Pydantic provides:
- Type validation at load time
- Range validation (e.g., rrf_k must be 1-200)
- Clear error messages for invalid configs
- Default values that match current hardcoded values
- JSON schema generation for documentation

ARCHITECTURE NOTE:
This file is THE LAW. Every tunable parameter must be defined here with:
- Field(default=..., ge=..., le=..., description=...)
- The UI reads these constraints to render sliders/inputs
- The API validates against these constraints
- TypeScript types are GENERATED from this file via pydantic2ts

To add a new feature:
1. Add the field here FIRST
2. Run: uv run scripts/generate_types.py
3. THEN implement the feature
"""
from typing import Any, Dict, List, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


# =============================================================================
# RETRIEVAL CONFIG
# =============================================================================

class RetrievalConfig(BaseModel):
    """Configuration for retrieval and search parameters."""

    rrf_k: int = Field(
        default=60,
        ge=1,
        le=200,
        description="RRF rank smoothing constant (higher = more weight to top ranks)"
    )

    final_k: int = Field(
        default=20,
        ge=1,
        le=100,
        description="Number of final results to return"
    )

    max_query_rewrites: int = Field(
        default=2,
        ge=1,
        le=10,
        description="Maximum number of query rewrites for multi-query expansion"
    )

    fallback_confidence: float = Field(
        default=0.55,
        ge=0.0,
        le=1.0,
        description="Confidence threshold for fallback retrieval strategies"
    )

    eval_final_k: int = Field(
        default=5,
        ge=1,
        le=50,
        description="Top-k for evaluation runs"
    )

    conf_top1: float = Field(
        default=0.62,
        ge=0.0,
        le=1.0,
        description="Confidence threshold for top-1 result"
    )

    conf_avg5: float = Field(
        default=0.55,
        ge=0.0,
        le=1.0,
        description="Confidence threshold for avg top-5"
    )

    conf_any: float = Field(
        default=0.55,
        ge=0.0,
        le=1.0,
        description="Minimum confidence threshold for any result"
    )

    eval_multi: int = Field(
        default=1,
        ge=0,
        le=1,
        description="Enable multi-query in eval (0=disabled, 1=enabled)"
    )

    query_expansion_enabled: int = Field(
        default=1,
        ge=0,
        le=1,
        description="Enable synonym expansion (0=disabled, 1=enabled)"
    )

    multi_query_m: int = Field(
        default=4,
        ge=1,
        le=10,
        description="Number of query variants for multi-query expansion"
    )

    use_semantic_synonyms: int = Field(
        default=1,
        ge=0,
        le=1,
        description="Enable semantic synonym expansion"
    )

    synonyms_path: str = Field(
        default="",
        description="Custom path to semantic_synonyms.json (default: data/semantic_synonyms.json)"
    )

    topk_dense: int = Field(
        default=75,
        ge=10,
        le=200,
        description="Top-K for dense vector search (pgvector)"
    )

    topk_sparse: int = Field(
        default=75,
        ge=10,
        le=200,
        description="Top-K for sparse BM25/FTS search"
    )

    topk_graph: int = Field(
        default=30,
        ge=5,
        le=100,
        description="Top-K for graph-based search (Neo4j)"
    )

    hydration_mode: str = Field(
        default="lazy",
        pattern="^(lazy|eager|none|off)$",
        description="Result hydration mode"
    )

    hydration_max_chars: int = Field(
        default=2000,
        ge=500,
        le=10000,
        description="Max characters for result hydration"
    )

    @field_validator('rrf_k')
    @classmethod
    def validate_rrf_k(cls, v):
        if v < 10:
            raise ValueError('rrf_k should be at least 10 for meaningful rank smoothing')
        return v

    @field_validator('hydration_mode', mode='before')
    @classmethod
    def normalize_hydration(cls, v: str) -> str:
        if isinstance(v, str):
            val = v.strip().lower()
            if val == 'off':
                return 'none'
            return val
        return v


# =============================================================================
# FUSION CONFIG (Tri-Brid Specific)
# =============================================================================

class FusionConfig(BaseModel):
    """Configuration for tri-brid fusion of vector + sparse + graph results."""

    method: Literal["rrf", "weighted"] = Field(
        default="rrf",
        description="Fusion method: 'rrf' (Reciprocal Rank Fusion) or 'weighted' (score-based)"
    )

    vector_weight: float = Field(
        default=0.4,
        ge=0.0,
        le=1.0,
        description="Weight for vector search results in weighted fusion"
    )

    sparse_weight: float = Field(
        default=0.3,
        ge=0.0,
        le=1.0,
        description="Weight for sparse/BM25 search results in weighted fusion"
    )

    graph_weight: float = Field(
        default=0.3,
        ge=0.0,
        le=1.0,
        description="Weight for graph search results in weighted fusion"
    )

    vector_enabled: int = Field(
        default=1,
        ge=0,
        le=1,
        description="Enable vector search leg (0=disabled, 1=enabled)"
    )

    sparse_enabled: int = Field(
        default=1,
        ge=0,
        le=1,
        description="Enable sparse/BM25 search leg (0=disabled, 1=enabled)"
    )

    graph_enabled: int = Field(
        default=1,
        ge=0,
        le=1,
        description="Enable graph search leg (0=disabled, 1=enabled)"
    )

    @model_validator(mode='after')
    def validate_weights_sum_to_one(self):
        """Normalize weights to sum to 1.0 instead of hard failing."""
        total = self.vector_weight + self.sparse_weight + self.graph_weight
        if total <= 0:
            self.vector_weight = 0.4
            self.sparse_weight = 0.3
            self.graph_weight = 0.3
            return self
        if not (0.99 <= total <= 1.01):
            self.vector_weight = self.vector_weight / total
            self.sparse_weight = self.sparse_weight / total
            self.graph_weight = self.graph_weight / total
        return self


# =============================================================================
# SCORING CONFIG
# =============================================================================

class ScoringConfig(BaseModel):
    """Configuration for result scoring and boosting."""

    chunk_summary_bonus: float = Field(
        default=0.08,
        ge=0.0,
        le=1.0,
        description="Bonus score for chunks matched via summary-based retrieval"
    )

    filename_boost_exact: float = Field(
        default=1.5,
        ge=1.0,
        le=5.0,
        description="Score multiplier when filename exactly matches query terms"
    )

    filename_boost_partial: float = Field(
        default=1.2,
        ge=1.0,
        le=3.0,
        description="Score multiplier when path components match query terms"
    )

    vendor_mode: str = Field(
        default="prefer_first_party",
        pattern="^(prefer_first_party|prefer_vendor|neutral)$",
        description="Vendor code preference: how to score third-party vs first-party code"
    )

    path_boosts: str = Field(
        default="/server,/web,/indexing,/retrieval",
        description="Comma-separated path prefixes to boost in scoring"
    )

    @model_validator(mode='after')
    def validate_exact_boost_greater_than_partial(self):
        if self.filename_boost_exact <= self.filename_boost_partial:
            raise ValueError('filename_boost_exact should be greater than filename_boost_partial')
        return self


# =============================================================================
# LAYER BONUS CONFIG
# =============================================================================

class LayerBonusConfig(BaseModel):
    """Layer-specific scoring bonuses with intent-aware matrix."""

    server: float = Field(
        default=0.15,
        ge=0.0,
        le=0.5,
        description="Bonus for server/backend layers"
    )

    web: float = Field(
        default=0.15,
        ge=0.0,
        le=0.5,
        description="Bonus for web/frontend layers"
    )

    retrieval: float = Field(
        default=0.15,
        ge=0.0,
        le=0.5,
        description="Bonus for retrieval layers"
    )

    indexing: float = Field(
        default=0.15,
        ge=0.0,
        le=0.5,
        description="Bonus for indexing layers"
    )

    vendor_penalty: float = Field(
        default=-0.1,
        ge=-0.5,
        le=0.0,
        description="Penalty for vendor/third-party code"
    )

    freshness_bonus: float = Field(
        default=0.05,
        ge=0.0,
        le=0.3,
        description="Bonus for recently modified files"
    )

    intent_matrix: Dict[str, Dict[str, float]] = Field(
        default_factory=lambda: {
            "server": {"server": 1.3, "retrieval": 1.15, "common": 1.1, "web": 0.7},
            "web": {"web": 1.2, "server": 0.9, "retrieval": 0.8},
            "retrieval": {"retrieval": 1.3, "server": 1.15, "common": 1.1, "web": 0.7},
            "indexing": {"indexing": 1.3, "retrieval": 1.15, "common": 1.1, "web": 0.7},
            "eval": {"eval": 1.3, "retrieval": 1.15, "server": 1.1, "web": 0.8},
            "infra": {"infra": 1.3, "scripts": 1.15, "server": 1.1, "web": 0.9},
        },
        description="Intent-to-layer bonus matrix. Keys are query intents, values are layer->multiplier maps."
    )


# =============================================================================
# EMBEDDING CONFIG
# =============================================================================

class EmbeddingConfig(BaseModel):
    """Embedding generation and caching configuration."""

    provider: str = Field(
        default="openai",
        description="Embedding provider (openai, voyage, local, huggingface)"
    )

    model: str = Field(
        default="text-embedding-3-large",
        description="Embedding model name"
    )

    dimensions: int = Field(
        default=3072,
        ge=128,
        le=4096,
        description="Embedding dimensions (must match model output)"
    )

    batch_size: int = Field(
        default=64,
        ge=1,
        le=256,
        description="Batch size for embedding generation"
    )

    max_tokens: int = Field(
        default=8000,
        ge=512,
        le=8192,
        description="Max tokens per embedding chunk"
    )

    cache_enabled: int = Field(
        default=1,
        ge=0,
        le=1,
        description="Enable embedding cache (0=disabled, 1=enabled)"
    )

    timeout: int = Field(
        default=30,
        ge=5,
        le=120,
        description="Embedding API timeout (seconds)"
    )

    retry_max: int = Field(
        default=3,
        ge=1,
        le=5,
        description="Max retries for embedding API"
    )

    voyage_model: str = Field(
        default="voyage-code-3",
        description="Voyage embedding model (when provider=voyage)"
    )

    local_model: str = Field(
        default="all-MiniLM-L6-v2",
        description="Local SentenceTransformer model (when provider=local)"
    )

    @field_validator('provider', mode='before')
    @classmethod
    def normalize_provider(cls, v: str) -> str:
        if isinstance(v, str):
            val = v.strip().lower()
            if val in {'hf', 'hugging_face', 'hugging-face'}:
                return 'huggingface'
            if val in {'sentence_transformers', 'sentence-transformers', 'st'}:
                return 'local'
            return val
        return v

    @field_validator('dimensions')
    @classmethod
    def validate_dimensions(cls, v):
        common_dims = [128, 256, 384, 512, 768, 1024, 1536, 2048, 3072, 4096]
        if v not in common_dims:
            raise ValueError(f'Uncommon embedding dimension: {v}. Expected one of {common_dims}')
        return v


# =============================================================================
# CHUNKING CONFIG
# =============================================================================

class ChunkingConfig(BaseModel):
    """Code chunking configuration."""

    strategy: str = Field(
        default="ast",
        pattern="^(ast|semantic|fixed|hybrid)$",
        description="Chunking strategy"
    )

    chunk_size: int = Field(
        default=1000,
        ge=200,
        le=5000,
        description="Target chunk size (non-whitespace chars)"
    )

    chunk_overlap: int = Field(
        default=200,
        ge=0,
        le=1000,
        description="Overlap between chunks"
    )

    ast_overlap_lines: int = Field(
        default=20,
        ge=0,
        le=100,
        description="Overlap lines for AST chunking"
    )

    max_file_size: int = Field(
        default=2000000,
        ge=10000,
        le=10000000,
        description="Max file size to index (bytes) - files larger are skipped"
    )

    max_chunk_tokens: int = Field(
        default=8000,
        ge=100,
        le=32000,
        description="Maximum tokens per chunk - chunks exceeding this are split"
    )

    min_chunk_chars: int = Field(
        default=50,
        ge=10,
        le=500,
        description="Minimum chunk size"
    )

    preserve_imports: int = Field(
        default=1,
        ge=0,
        le=1,
        description="Include imports in chunks"
    )

    @model_validator(mode='after')
    def validate_overlap_less_than_size(self):
        if self.chunk_overlap >= self.chunk_size:
            raise ValueError('chunk_overlap must be less than chunk_size')
        return self


# =============================================================================
# VECTOR STORAGE CONFIG (pgvector)
# =============================================================================

class VectorStorageConfig(BaseModel):
    """pgvector storage configuration (replaces Qdrant)."""

    postgres_url: str = Field(
        default="postgresql://tribrid:tribrid@localhost:5432/tribrid",
        description="PostgreSQL connection URL with pgvector extension"
    )

    table_name: str = Field(
        default="chunks_{repo}",
        description="Table name template for chunk storage"
    )

    index_type: str = Field(
        default="ivfflat",
        pattern="^(ivfflat|hnsw)$",
        description="pgvector index type: ivfflat (faster build) or hnsw (faster query)"
    )

    ivfflat_lists: int = Field(
        default=100,
        ge=10,
        le=1000,
        description="Number of IVFFlat lists (higher = slower build, faster query)"
    )

    hnsw_m: int = Field(
        default=16,
        ge=4,
        le=64,
        description="HNSW max connections per layer"
    )

    hnsw_ef_construction: int = Field(
        default=64,
        ge=16,
        le=512,
        description="HNSW ef_construction (higher = better recall, slower build)"
    )

    hnsw_ef_search: int = Field(
        default=40,
        ge=10,
        le=200,
        description="HNSW ef_search (higher = better recall, slower query)"
    )


# =============================================================================
# GRAPH STORAGE CONFIG (Neo4j)
# =============================================================================

class GraphStorageConfig(BaseModel):
    """Neo4j graph storage configuration for entity/relationship search."""

    neo4j_uri: str = Field(
        default="bolt://localhost:7687",
        description="Neo4j Bolt connection URI"
    )

    neo4j_user: str = Field(
        default="neo4j",
        description="Neo4j username"
    )

    neo4j_password: str = Field(
        default="tribrid",
        description="Neo4j password"
    )

    max_hops: int = Field(
        default=2,
        ge=1,
        le=5,
        description="Maximum relationship hops for graph traversal"
    )

    include_communities: int = Field(
        default=1,
        ge=0,
        le=1,
        description="Include community detection results in graph search"
    )

    community_algorithm: str = Field(
        default="louvain",
        pattern="^(louvain|leiden|label_propagation)$",
        description="Community detection algorithm"
    )

    entity_types: List[str] = Field(
        default_factory=lambda: ["function", "class", "module", "variable", "concept"],
        description="Entity types to extract during indexing"
    )

    relationship_types: List[str] = Field(
        default_factory=lambda: ["calls", "imports", "inherits", "contains", "references", "related_to"],
        description="Relationship types to extract during indexing"
    )


# =============================================================================
# SPARSE SEARCH CONFIG (Postgres FTS)
# =============================================================================

class SparseSearchConfig(BaseModel):
    """Postgres Full-Text Search (BM25-like) configuration."""

    bm25_k1: float = Field(
        default=1.2,
        ge=0.5,
        le=3.0,
        description="BM25 term frequency saturation (higher = more weight to term frequency)"
    )

    bm25_b: float = Field(
        default=0.4,
        ge=0.0,
        le=1.0,
        description="BM25 length normalization (0=no penalty, 1=full penalty)"
    )

    tokenizer: str = Field(
        default="english",
        description="Postgres FTS text search configuration"
    )

    stemmer_lang: str = Field(
        default="english",
        description="Stemmer language for FTS"
    )


# =============================================================================
# RERANKING CONFIG
# =============================================================================

class RerankingConfig(BaseModel):
    """Reranking configuration for result refinement."""

    mode: str = Field(
        default="local",
        pattern="^(cloud|local|trained|none)$",
        description="Reranker mode: 'cloud' (API), 'local' (HuggingFace), 'trained' (custom), 'none'"
    )

    cloud_provider: str = Field(
        default="cohere",
        description="Cloud reranker provider when mode=cloud (cohere, voyage, jina)"
    )

    cloud_model: str = Field(
        default="rerank-v3.5",
        description="Cloud reranker model name"
    )

    local_model: str = Field(
        default="cross-encoder/ms-marco-MiniLM-L-12-v2",
        description="Local HuggingFace cross-encoder model"
    )

    trained_model_path: str = Field(
        default="models/cross-encoder-tribrid",
        description="Path to trained custom reranker model"
    )

    alpha: float = Field(
        default=0.7,
        ge=0.0,
        le=1.0,
        description="Blend weight for reranker scores vs original scores"
    )

    top_n: int = Field(
        default=50,
        ge=10,
        le=200,
        description="Number of candidates to rerank"
    )

    batch_size: int = Field(
        default=16,
        ge=1,
        le=128,
        description="Reranker batch size"
    )

    max_length: int = Field(
        default=512,
        ge=128,
        le=2048,
        description="Max token length for reranker input"
    )

    timeout: int = Field(
        default=10,
        ge=5,
        le=60,
        description="Reranker API timeout (seconds)"
    )

    reload_on_change: int = Field(
        default=0,
        ge=0,
        le=1,
        description="Hot-reload model when file changes"
    )

    reload_period_sec: int = Field(
        default=60,
        ge=10,
        le=600,
        description="Period for checking model file changes"
    )

    @field_validator('mode', mode='before')
    @classmethod
    def normalize_mode(cls, v: str) -> str:
        if isinstance(v, str):
            val = v.strip().lower()
            if val in {'off', 'disabled'}:
                return 'none'
            if val == 'hf':
                return 'local'
            if val in {'cohere', 'voyage', 'jina'}:
                return 'cloud'
            if val == 'learning':
                return 'trained'
            return val
        return v


# =============================================================================
# GENERATION CONFIG
# =============================================================================

class GenerationConfig(BaseModel):
    """LLM generation configuration."""

    model: str = Field(
        default="gpt-4o-mini",
        description="Primary generation model"
    )

    temperature: float = Field(
        default=0.0,
        ge=0.0,
        le=2.0,
        description="Generation temperature"
    )

    max_tokens: int = Field(
        default=2048,
        ge=100,
        le=8192,
        description="Max tokens for generation"
    )

    top_p: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
        description="Nucleus sampling threshold"
    )

    timeout: int = Field(
        default=60,
        ge=10,
        le=300,
        description="Generation timeout (seconds)"
    )

    retry_max: int = Field(
        default=2,
        ge=1,
        le=5,
        description="Max retries for generation"
    )

    openai_base_url: str = Field(
        default="",
        description="OpenAI API base URL override (for proxies)"
    )

    ollama_url: str = Field(
        default="http://127.0.0.1:11434/api",
        description="Ollama API URL"
    )

    ollama_model: str = Field(
        default="qwen3-coder:30b",
        description="Ollama generation model"
    )

    ollama_num_ctx: int = Field(
        default=8192,
        ge=2048,
        le=32768,
        description="Context window for Ollama"
    )

    ollama_request_timeout: int = Field(
        default=300,
        ge=30,
        le=1200,
        description="Ollama request timeout (seconds)"
    )


# =============================================================================
# CHUNK SUMMARY CONFIG (formerly "cards")
# =============================================================================

class ChunkSummaryConfig(BaseModel):
    """Chunk summary generation and filtering configuration."""

    enrich_enabled: int = Field(
        default=1,
        ge=0,
        le=1,
        description="Enable chunk summary enrichment"
    )

    max_summaries: int = Field(
        default=100,
        ge=10,
        le=1000,
        description="Max summaries to generate per indexing run"
    )

    enrich_min_chars: int = Field(
        default=50,
        ge=10,
        le=500,
        description="Min chars for enrichment"
    )

    enrich_max_chars: int = Field(
        default=1000,
        ge=100,
        le=5000,
        description="Max chars for enrichment prompt"
    )

    enrich_timeout: int = Field(
        default=30,
        ge=5,
        le=120,
        description="Enrichment timeout (seconds)"
    )

    enrich_model: str = Field(
        default="gpt-4o-mini",
        description="Model for chunk enrichment"
    )

    exclude_dirs: List[str] = Field(
        default_factory=lambda: [
            "docs", "tests", "assets", "out", "checkpoints",
            "models", "data", "node_modules", "dist", "build"
        ],
        description="Directories to skip when building summaries"
    )

    exclude_patterns: List[str] = Field(
        default_factory=list,
        description="File patterns to skip"
    )

    code_snippet_length: int = Field(
        default=2000,
        ge=500,
        le=10000,
        description="Max code snippet length in summaries"
    )

    max_symbols: int = Field(
        default=5,
        ge=1,
        le=20,
        description="Max symbols to include per summary"
    )

    purpose_max_length: int = Field(
        default=240,
        ge=50,
        le=500,
        description="Max length for purpose field"
    )


# =============================================================================
# KEYWORDS CONFIG
# =============================================================================

class KeywordsConfig(BaseModel):
    """Discriminative keywords configuration."""

    max_per_repo: int = Field(
        default=50,
        ge=10,
        le=500,
        description="Max discriminative keywords per repo"
    )

    min_freq: int = Field(
        default=3,
        ge=1,
        le=10,
        description="Min frequency for keyword"
    )

    boost: float = Field(
        default=1.3,
        ge=1.0,
        le=3.0,
        description="Score boost for keyword matches"
    )

    auto_generate: int = Field(
        default=1,
        ge=0,
        le=1,
        description="Auto-generate keywords during indexing"
    )

    refresh_hours: int = Field(
        default=24,
        ge=1,
        le=168,
        description="Hours between keyword refresh"
    )


# =============================================================================
# TRACING CONFIG
# =============================================================================

class TracingConfig(BaseModel):
    """Observability and tracing configuration."""

    enabled: int = Field(
        default=1,
        ge=0,
        le=1,
        description="Enable distributed tracing"
    )

    sampling_rate: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
        description="Trace sampling rate (0.0-1.0)"
    )

    prometheus_port: int = Field(
        default=9090,
        ge=1024,
        le=65535,
        description="Prometheus metrics port"
    )

    metrics_enabled: int = Field(
        default=1,
        ge=0,
        le=1,
        description="Enable metrics collection"
    )

    log_level: str = Field(
        default="INFO",
        pattern="^(DEBUG|INFO|WARNING|ERROR)$",
        description="Logging level"
    )

    log_path: str = Field(
        default="data/logs/queries.jsonl",
        description="Query log file path"
    )

    trace_retention: int = Field(
        default=50,
        ge=10,
        le=500,
        description="Number of traces to retain"
    )

    alert_notify_severities: str = Field(
        default="critical,warning",
        description="Severity levels to notify on"
    )

    alert_include_resolved: int = Field(
        default=1,
        ge=0,
        le=1,
        description="Include resolved alerts in notifications"
    )


# =============================================================================
# TRAINING CONFIG (Self-Learning Reranker)
# =============================================================================

class TrainingConfig(BaseModel):
    """Self-learning reranker training configuration."""

    train_epochs: int = Field(
        default=2,
        ge=1,
        le=10,
        description="Training epochs"
    )

    train_batch: int = Field(
        default=16,
        ge=4,
        le=64,
        description="Training batch size"
    )

    train_lr: float = Field(
        default=2e-5,
        ge=1e-6,
        le=1e-3,
        description="Learning rate"
    )

    warmup_ratio: float = Field(
        default=0.1,
        ge=0.0,
        le=0.5,
        description="Warmup ratio"
    )

    triplets_min_count: int = Field(
        default=100,
        ge=10,
        le=1000,
        description="Minimum triplets before training"
    )

    triplets_mine_mode: str = Field(
        default="replace",
        pattern="^(replace|append)$",
        description="Triplet mining mode"
    )

    model_path: str = Field(
        default="models/cross-encoder-tribrid",
        description="Output model path"
    )

    triplets_path: str = Field(
        default="data/training/triplets.jsonl",
        description="Training triplets file path"
    )


# =============================================================================
# UI CONFIG
# =============================================================================

class UIConfig(BaseModel):
    """User interface configuration."""

    chat_streaming_enabled: int = Field(
        default=1,
        ge=0,
        le=1,
        description="Enable streaming responses"
    )

    chat_history_max: int = Field(
        default=50,
        ge=10,
        le=500,
        description="Max chat history messages"
    )

    chat_show_confidence: int = Field(
        default=0,
        ge=0,
        le=1,
        description="Show confidence badge on chat answers"
    )

    chat_show_citations: int = Field(
        default=1,
        ge=0,
        le=1,
        description="Show citations list on chat answers"
    )

    chat_show_trace: int = Field(
        default=0,
        ge=0,
        le=1,
        description="Show routing trace panel by default"
    )

    chat_default_model: str = Field(
        default="gpt-4o-mini",
        description="Default model for chat"
    )

    chat_stream_timeout: int = Field(
        default=120,
        ge=30,
        le=600,
        description="Streaming response timeout (seconds)"
    )

    theme_mode: str = Field(
        default="dark",
        pattern="^(light|dark|auto)$",
        description="UI theme mode"
    )

    open_browser: int = Field(
        default=1,
        ge=0,
        le=1,
        description="Auto-open browser on start"
    )

    grafana_base_url: str = Field(
        default="http://127.0.0.1:3000",
        description="Grafana base URL"
    )

    grafana_dashboard_uid: str = Field(
        default="tribrid-overview",
        description="Default Grafana dashboard UID"
    )

    grafana_embed_enabled: int = Field(
        default=1,
        ge=0,
        le=1,
        description="Enable Grafana embedding"
    )

    grafana_kiosk: str = Field(
        default="tv",
        description="Grafana kiosk mode"
    )


# =============================================================================
# EVALUATION CONFIG
# =============================================================================

class EvaluationConfig(BaseModel):
    """Evaluation dataset configuration (formerly 'golden')."""

    dataset_path: str = Field(
        default="data/eval_dataset.json",
        description="Evaluation dataset path"
    )

    baseline_path: str = Field(
        default="data/evals/eval_baseline.json",
        description="Baseline results path"
    )

    eval_multi_m: int = Field(
        default=10,
        ge=1,
        le=20,
        description="Multi-query variants for evaluation"
    )


# =============================================================================
# SYSTEM PROMPTS CONFIG
# =============================================================================

class SystemPromptsConfig(BaseModel):
    """System prompts for LLM interactions."""

    main_rag_chat: str = Field(
        default='''You are an expert software engineer and code analysis assistant.

## Your Role:
- Answer questions about the indexed codebase with precision and accuracy
- Always cite specific file paths and line ranges from the provided code context
- Provide clear explanations of how code works, what it does, and why

## Guidelines:
- **Be Evidence-Based**: Ground every answer in the provided code context
- **Be Specific**: Include file paths, line numbers, function/class names
- **Be Clear**: Explain technical concepts accessibly
- **Be Honest**: If the context doesn't contain enough information, say so

You answer strictly from the provided code context.''',
        description="Main conversational AI system prompt"
    )

    query_expansion: str = Field(
        default='''Generate alternative search queries using different terminology.
Output one query variant per line. Keep variants concise (3-8 words).
Use technical synonyms. Do NOT include explanations.''',
        description="Query expansion prompt"
    )

    chunk_summary: str = Field(
        default='''Analyze this code and create a JSON summary:
{
  "symbols": ["function_name", "class_name"],
  "purpose": "Clear business purpose",
  "keywords": ["technical_term1", "technical_term2"]
}
Return ONLY valid JSON.''',
        description="Chunk summary generation prompt"
    )

    eval_analysis: str = Field(
        default='''Analyze evaluation comparisons with HONEST, SKEPTICAL insights.
If data is contradictory, say so. Consider index changes, data drift.
Acknowledge when correlation != causation.''',
        description="Evaluation analysis prompt"
    )


# =============================================================================
# DOCKER CONFIG
# =============================================================================

class DockerConfig(BaseModel):
    """Docker infrastructure configuration."""

    docker_host: str = Field(
        default="",
        description="Docker socket URL. Leave empty for auto-detection."
    )

    status_timeout: int = Field(
        default=5,
        ge=1,
        le=30,
        description="Timeout for Docker status check (seconds)"
    )

    container_list_timeout: int = Field(
        default=10,
        ge=1,
        le=60,
        description="Timeout for container list (seconds)"
    )

    container_action_timeout: int = Field(
        default=30,
        ge=5,
        le=120,
        description="Timeout for container actions (seconds)"
    )

    infra_up_timeout: int = Field(
        default=60,
        ge=30,
        le=300,
        description="Timeout for infra up command (seconds)"
    )

    logs_tail: int = Field(
        default=100,
        ge=10,
        le=1000,
        description="Default log lines to tail"
    )

    dev_frontend_port: int = Field(
        default=5173,
        ge=1024,
        le=65535,
        description="Dev frontend port (Vite)"
    )

    dev_backend_port: int = Field(
        default=8012,
        ge=1024,
        le=65535,
        description="Dev backend port (Uvicorn)"
    )


# =============================================================================
# INDEXING CONFIG
# =============================================================================

class IndexingConfig(BaseModel):
    """General indexing configuration."""

    batch_size: int = Field(
        default=100,
        ge=10,
        le=1000,
        description="Batch size for indexing operations"
    )

    workers: int = Field(
        default=4,
        ge=1,
        le=16,
        description="Parallel workers for indexing"
    )

    excluded_exts: str = Field(
        default=".png,.jpg,.gif,.ico,.svg,.woff,.ttf,.mp3,.mp4,.zip,.tar,.gz",
        description="Excluded file extensions (comma-separated)"
    )

    max_file_size_mb: int = Field(
        default=10,
        ge=1,
        le=100,
        description="Max file size to index (MB)"
    )

    repos_file: str = Field(
        default="./repos.json",
        description="Repository configuration file"
    )

    output_dir: str = Field(
        default="./out",
        description="Base output directory for index artifacts"
    )


# =============================================================================
# ROOT CONFIG
# =============================================================================

class TriBridConfigRoot(BaseModel):
    """Root configuration model for tribrid_config.json.

    This is the top-level model that contains all configuration categories.
    The nested structure provides logical grouping and better organization.

    ARCHITECTURE NOTE:
    This is THE SINGLE SOURCE OF TRUTH for all tunable parameters.
    - UI sliders get their min/max from Field(ge=..., le=...)
    - API validation uses these constraints
    - TypeScript types are GENERATED from this file
    """

    retrieval: RetrievalConfig = Field(default_factory=RetrievalConfig)
    fusion: FusionConfig = Field(default_factory=FusionConfig)
    scoring: ScoringConfig = Field(default_factory=ScoringConfig)
    layer_bonus: LayerBonusConfig = Field(default_factory=LayerBonusConfig)
    embedding: EmbeddingConfig = Field(default_factory=EmbeddingConfig)
    chunking: ChunkingConfig = Field(default_factory=ChunkingConfig)
    vector_storage: VectorStorageConfig = Field(default_factory=VectorStorageConfig)
    graph_storage: GraphStorageConfig = Field(default_factory=GraphStorageConfig)
    sparse_search: SparseSearchConfig = Field(default_factory=SparseSearchConfig)
    reranking: RerankingConfig = Field(default_factory=RerankingConfig)
    generation: GenerationConfig = Field(default_factory=GenerationConfig)
    chunk_summary: ChunkSummaryConfig = Field(default_factory=ChunkSummaryConfig)
    keywords: KeywordsConfig = Field(default_factory=KeywordsConfig)
    tracing: TracingConfig = Field(default_factory=TracingConfig)
    training: TrainingConfig = Field(default_factory=TrainingConfig)
    ui: UIConfig = Field(default_factory=UIConfig)
    evaluation: EvaluationConfig = Field(default_factory=EvaluationConfig)
    system_prompts: SystemPromptsConfig = Field(default_factory=SystemPromptsConfig)
    docker: DockerConfig = Field(default_factory=DockerConfig)
    indexing: IndexingConfig = Field(default_factory=IndexingConfig)

    model_config = ConfigDict(
        extra="allow",
        json_schema_extra={
            "description": "TriBridRAG tunable configuration parameters",
            "title": "TriBrid Config",
        },
    )
