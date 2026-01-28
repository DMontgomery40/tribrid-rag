import { client } from '../api/client';
import type { RerankerStatus } from '../types/ui';

export const RerankService = {
  async getStatus(): Promise<RerankerStatus> {
    return client.get('/reranker/status');
  },

  async getTriplets(repoId: string, limit = 100): Promise<unknown[]> {
    return client.get(`/reranker/triplets/${repoId}?limit=${limit}`);
  },

  async addTriplet(repoId: string, query: string, positive: string, negative: string): Promise<void> {
    return client.post(`/reranker/triplets/${repoId}`, { query, positive, negative });
  },

  async train(repoId?: string): Promise<unknown> {
    const params = repoId ? `?repo_id=${repoId}` : '';
    return client.post(`/reranker/train${params}`);
  },

  async promote(modelPath: string): Promise<void> {
    return client.post('/reranker/promote', { model_path: modelPath });
  },
};
