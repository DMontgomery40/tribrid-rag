import { useState, useCallback } from 'react';
import { useRepoStore } from '../stores';
import type { IndexStatus, IndexStats } from '../types/generated';

export function useIndexing() {
  const [status, setStatus] = useState<IndexStatus | null>(null);
  const [stats, setStats] = useState<IndexStats | null>(null);
  const activeRepoId = useRepoStore((s) => s.activeRepoId);

  const startIndex = useCallback(async (repoId: string, force = false) => {
    const res = await fetch('/api/index', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo_id: repoId, force_reindex: force }),
    });
    setStatus(await res.json());
  }, []);

  const cancelIndex = useCallback(async () => {
    // Cancel not implemented in API yet
  }, []);

  const refreshStatus = useCallback(async () => {
    if (!activeRepoId) return;
    const res = await fetch(`/api/index/${activeRepoId}/status`);
    setStatus(await res.json());
  }, [activeRepoId]);

  const refreshStats = useCallback(async (repoId: string) => {
    const res = await fetch(`/api/index/${repoId}/stats`);
    setStats(await res.json());
  }, []);

  return {
    status,
    stats,
    startIndex,
    cancelIndex,
    refreshStatus,
    refreshStats,
  };
}
