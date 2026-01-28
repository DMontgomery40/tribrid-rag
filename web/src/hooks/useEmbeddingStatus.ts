import { useState, useEffect } from 'react';
import { useConfigStore, useRepoStore } from '../stores';

export function useEmbeddingStatus() {
  const config = useConfigStore((s) => s.config);
  const activeRepoId = useRepoStore((s) => s.activeRepoId);

  const [mismatch, setMismatch] = useState(false);
  const [currentModel, setCurrentModel] = useState<string | null>(null);
  const [indexedModel, setIndexedModel] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    async function check() {
      if (!activeRepoId || !config) {
        setMismatch(false);
        return;
      }
      try {
        const res = await fetch(`/api/index/${activeRepoId}/stats`);
        const stats = await res.json();
        const current = config.embedding.model;
        const indexed = stats.embedding_model;
        setCurrentModel(current);
        setIndexedModel(indexed);
        setMismatch(current !== indexed && !!indexed);
      } catch {
        setMismatch(false);
      }
    }
    check();
  }, [activeRepoId, config]);

  const dismiss = () => setDismissed(true);

  return {
    mismatch: mismatch && !dismissed,
    currentModel,
    indexedModel,
    dismiss,
  };
}
