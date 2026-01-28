import { useEffect, useState } from 'react';
import { useConfigStore, useRepoStore, useHealthStore } from '../stores';

export function useAppInit() {
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useConfigStore((s) => s.fetchConfig);
  const fetchRepos = useRepoStore((s) => s.fetchRepos);
  const checkHealth = useHealthStore((s) => s.checkHealth);

  useEffect(() => {
    async function init() {
      try {
        await Promise.all([fetchConfig(), fetchRepos(), checkHealth()]);
        setInitialized(true);
      } catch (e) {
        setError((e as Error).message);
      }
    }
    init();
  }, [fetchConfig, fetchRepos, checkHealth]);

  return { initialized, error };
}
