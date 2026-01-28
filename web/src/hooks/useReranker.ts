import { useState, useCallback } from 'react';
import type { RerankerStatus } from '../types/ui';

export function useReranker() {
  const [status, setStatus] = useState<RerankerStatus>({
    mode: 'none',
    model_loaded: false,
    model_path: null,
    last_trained: null,
  });
  const [tripletCount, setTripletCount] = useState(0);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/reranker/status');
      const data = await res.json();
      setStatus(data);
      setTripletCount(data.triplet_count || 0);
    } catch {
      // Reranker status optional
    }
  }, []);

  const trainModel = useCallback(async () => {
    await fetch('/api/reranker/train', { method: 'POST' });
    await refreshStatus();
  }, [refreshStatus]);

  const promoteModel = useCallback(async (path: string) => {
    await fetch('/api/reranker/promote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model_path: path }),
    });
    await refreshStatus();
  }, [refreshStatus]);

  return {
    status,
    tripletCount,
    trainModel,
    promoteModel,
    refreshStatus,
  };
}
