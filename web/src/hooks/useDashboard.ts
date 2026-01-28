import { useState, useCallback } from 'react';
import { useHealthStore } from '../stores';
import type { SystemStatus, ActivityItem, CostSummary, IndexStatus } from '../types';

export function useDashboard() {
  const services = useHealthStore((s) => s.services);
  const checkHealth = useHealthStore((s) => s.checkHealth);

  const [indexingStatus, setIndexingStatus] = useState<IndexStatus | null>(null);
  const [costSummary, setCostSummary] = useState<CostSummary | null>(null);
  const [recentActivity] = useState<ActivityItem[]>([]);

  const systemStatus: SystemStatus = {
    postgres: services['postgres'] || { name: 'postgres', healthy: false, latency_ms: 0, error: null },
    neo4j: services['neo4j'] || { name: 'neo4j', healthy: false, latency_ms: 0, error: null },
    api: services['api'] || { name: 'api', healthy: false, latency_ms: 0, error: null },
  };

  const refresh = useCallback(async () => {
    await checkHealth();
    try {
      const costRes = await fetch('/api/cost/summary?period=month');
      setCostSummary(await costRes.json());
    } catch {
      // Cost endpoint optional
    }
  }, [checkHealth]);

  return {
    systemStatus,
    indexingStatus,
    costSummary,
    recentActivity,
    refresh,
  };
}
