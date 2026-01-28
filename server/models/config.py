from typing import Literal

from pydantic import BaseModel


class EmbeddingConfig(BaseModel):
    provider: Literal["openai", "voyage", "local"]
    model: str
    dimensions: int
    batch_size: int = 100


class VectorSearchConfig(BaseModel):
    enabled: bool = True
    top_k: int = 50
    similarity_threshold: float = 0.0


class SparseSearchConfig(BaseModel):
    enabled: bool = True
    top_k: int = 50
    bm25_k1: float = 1.5
    bm25_b: float = 0.75


class GraphSearchConfig(BaseModel):
    enabled: bool = True
    max_hops: int = 2
    top_k: int = 20
    include_communities: bool = True


class FusionConfig(BaseModel):
    method: Literal["rrf", "weighted"]
    vector_weight: float = 0.4
    sparse_weight: float = 0.3
    graph_weight: float = 0.3
    rrf_k: int = 60


class RerankerConfig(BaseModel):
    mode: Literal["none", "local", "trained", "api"]
    local_model: str | None = "cross-encoder/ms-marco-MiniLM-L-6-v2"
    trained_model_path: str | None = "models/cross-encoder-tribrid"
    api_provider: Literal["cohere", "voyage", "jina"] | None = None
    api_model: str | None = None
    top_n: int = 20
    batch_size: int = 16
    max_length: int = 512


class ChunkerConfig(BaseModel):
    strategy: Literal["ast", "semantic", "fixed"]
    chunk_size: int = 1500
    chunk_overlap: int = 200
    min_chunk_size: int = 100


class ObservabilityConfig(BaseModel):
    metrics_enabled: bool = True
    tracing_enabled: bool = True
    grafana_url: str | None = None


class TriBridConfig(BaseModel):
    """Root config - SINGLE SOURCE OF TRUTH"""

    embedding: EmbeddingConfig
    vector_search: VectorSearchConfig
    sparse_search: SparseSearchConfig
    graph_search: GraphSearchConfig
    fusion: FusionConfig
    reranker: RerankerConfig
    chunker: ChunkerConfig
    observability: ObservabilityConfig
