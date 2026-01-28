import { client } from './client';
import type { EvalRequest, EvalRun } from '../types/generated';

export const run = (request: EvalRequest) =>
  client.post<EvalRun>('/eval/run', request);

export const listRuns = (repoId?: string, limit = 20) => {
  const params = new URLSearchParams();
  if (repoId) params.set('repo_id', repoId);
  params.set('limit', limit.toString());
  return client.get<EvalRun[]>(`/eval/runs?${params}`);
};

export const getRun = (runId: string) =>
  client.get<EvalRun>(`/eval/run/${runId}`);

export const deleteRun = (runId: string) =>
  client.delete(`/eval/run/${runId}`);
