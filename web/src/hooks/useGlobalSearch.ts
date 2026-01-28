import { useState, useCallback } from 'react';
import { useRepoStore } from '../stores';
import type { SearchResponse } from '../types/generated';

export function useGlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const activeRepoId = useRepoStore((s) => s.activeRepoId);

  const search = useCallback(async () => {
    if (!query.trim() || !activeRepoId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, repo_id: activeRepoId }),
      });
      setResults(await res.json());
    } finally {
      setLoading(false);
    }
  }, [query, activeRepoId]);

  const clear = useCallback(() => {
    setQuery('');
    setResults(null);
  }, []);

  return {
    query,
    results,
    loading,
    setQuery,
    search,
    clear,
  };
}
