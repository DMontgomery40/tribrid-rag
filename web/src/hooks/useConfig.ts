import { useConfigStore } from '../stores';
import type { TRIBRIDConfig, EmbeddingConfig, FusionConfig, RerankingConfig, VectorSearchConfig, SparseSearchConfig, GraphSearchConfig } from '../types/generated';

export function useConfig() {
  const config = useConfigStore((s) => s.config);
  const loading = useConfigStore((s) => s.loading);
  const error = useConfigStore((s) => s.error);
  const dirty = useConfigStore((s) => s.dirty);
  const updateConfig = useConfigStore((s) => s.updateConfig);
  const updateSection = useConfigStore((s) => s.updateSection);
  const resetConfig = useConfigStore((s) => s.resetConfig);
  const setDirty = useConfigStore((s) => s.setDirty);

  const updateEmbedding = async (updates: Partial<EmbeddingConfig>) => {
    await updateSection('embedding', updates);
  };

  const updateFusion = async (updates: Partial<FusionConfig>) => {
    await updateSection('fusion', updates);
  };

  const updateReranker = async (updates: Partial<RerankingConfig>) => {
    await updateSection('reranking', updates);
  };

  const updateVectorSearch = async (updates: Partial<VectorSearchConfig>) => {
    await updateSection('vector_search', updates);
  };

  const updateSparseSearch = async (updates: Partial<SparseSearchConfig>) => {
    await updateSection('sparse_search', updates);
  };

  const updateGraphSearch = async (updates: Partial<GraphSearchConfig>) => {
    await updateSection('graph_search', updates);
  };

  const saveConfig = async () => {
    if (config) {
      await updateConfig(config);
    }
  };

  return {
    config,
    loading,
    error,
    dirty,
    updateConfig,
    updateEmbedding,
    updateFusion,
    updateReranker,
    updateVectorSearch,
    updateSparseSearch,
    updateGraphSearch,
    saveConfig,
    resetConfig,
  };
}
