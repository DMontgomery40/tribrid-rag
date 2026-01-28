import { client } from '../api/client';
import type { IndexRequest, IndexStatus, IndexStats } from '../types/generated';

export const IndexingService = {
  async startIndex(request: IndexRequest): Promise<IndexStatus> {
    return client.post('/index', request);
  },

  async getStatus(repoId: string): Promise<IndexStatus> {
    return client.get(`/index/${repoId}/status`);
  },

  async getStats(repoId: string): Promise<IndexStats> {
    return client.get(`/index/${repoId}/stats`);
  },

  async deleteIndex(repoId: string): Promise<void> {
    return client.delete(`/index/${repoId}`);
  },
};
