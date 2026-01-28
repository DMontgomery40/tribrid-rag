import { useConfigStore } from '../stores';

export function useFusion() {
  const config = useConfigStore((s) => s.config);
  const updateSection = useConfigStore((s) => s.updateSection);

  const weights = {
    vector: config?.fusion.vector_weight ?? 0.4,
    sparse: config?.fusion.sparse_weight ?? 0.3,
    graph: config?.fusion.graph_weight ?? 0.3,
  };

  const method = config?.fusion.method ?? 'rrf';

  const setWeights = async (newWeights: { vector: number; sparse: number; graph: number }) => {
    await updateSection('fusion', {
      vector_weight: newWeights.vector,
      sparse_weight: newWeights.sparse,
      graph_weight: newWeights.graph,
    });
  };

  const setMethod = async (newMethod: 'rrf' | 'weighted') => {
    await updateSection('fusion', { method: newMethod });
  };

  const normalizeWeights = async () => {
    const total = weights.vector + weights.sparse + weights.graph;
    if (total === 0) return;
    await setWeights({
      vector: weights.vector / total,
      sparse: weights.sparse / total,
      graph: weights.graph / total,
    });
  };

  return {
    weights,
    method,
    setWeights,
    setMethod,
    normalizeWeights,
  };
}
