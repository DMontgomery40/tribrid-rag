import { useConfigStore } from '../stores';
import type { TriBridConfig, EmbeddingConfig, FusionConfig, RerankerConfig } from '../types/generated';

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

  const updateReranker = async (updates: Partial<RerankerConfig>) => {
    await updateSection('reranker', updates);
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
    saveConfig,
    resetConfig,
  };
}
