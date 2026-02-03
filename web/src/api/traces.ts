import { apiClient, api } from './client';
import type { TracesLatestResponse } from '@/types/generated';

export const tracesApi = {
  async getLatest(opts?: { runId?: string | null; repo?: string | null }): Promise<TracesLatestResponse> {
    const qs = new URLSearchParams();
    if (opts?.runId) qs.set('run_id', String(opts.runId));
    if (opts?.repo) qs.set('repo', String(opts.repo));
    const path = `/traces/latest${qs.toString() ? `?${qs.toString()}` : ''}`;
    const { data } = await apiClient.get<TracesLatestResponse>(api(path));
    return data;
  },
};

