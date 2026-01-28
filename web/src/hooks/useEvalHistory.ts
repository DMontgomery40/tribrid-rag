import { useState, useCallback } from 'react';
import type { EvalRun, EvalComparison } from '../types';

export function useEvalHistory() {
  const [runs, setRuns] = useState<EvalRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<EvalRun | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchRuns = useCallback(async (repoId?: string) => {
    setLoading(true);
    try {
      const url = repoId ? `/api/eval/runs?repo_id=${repoId}` : '/api/eval/runs';
      const res = await fetch(url);
      setRuns(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  const selectRun = useCallback(async (runId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/eval/run/${runId}`);
      setSelectedRun(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteRun = useCallback(async (runId: string) => {
    await fetch(`/api/eval/run/${runId}`, { method: 'DELETE' });
    setRuns((prev) => prev.filter((r) => r.run_id !== runId));
    if (selectedRun?.run_id === runId) setSelectedRun(null);
  }, [selectedRun]);

  const compareRuns = useCallback((runIds: string[]): EvalComparison => {
    const selected = runs.filter((r) => runIds.includes(r.run_id));
    const metricKeys = ['mrr', 'recall_at_5', 'recall_at_10', 'recall_at_20', 'precision_at_5', 'ndcg_at_10'];
    const metrics: Record<string, number[]> = {};
    const improvements: Record<string, number> = {};

    for (const key of metricKeys) {
      metrics[key] = selected.map((r) => (r.metrics as Record<string, number>)[key]);
      if (metrics[key].length >= 2) {
        improvements[key] = metrics[key][metrics[key].length - 1] - metrics[key][0];
      }
    }

    return { runs: runIds, metrics, improvements };
  }, [runs]);

  return {
    runs,
    selectedRun,
    loading,
    fetchRuns,
    selectRun,
    deleteRun,
    compareRuns,
  };
}
