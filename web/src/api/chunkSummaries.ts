import { apiClient, api } from './client';
import type { ChunkSummariesBuildRequest, ChunkSummariesResponse } from '@/types/generated';

export const chunkSummariesApi = {
  async list(corpusId: string): Promise<ChunkSummariesResponse> {
    const qs = new URLSearchParams({ corpus_id: corpusId });
    const { data } = await apiClient.get<ChunkSummariesResponse>(api(`/chunk_summaries?${qs.toString()}`));
    return data;
  },

  async build(request: ChunkSummariesBuildRequest): Promise<ChunkSummariesResponse> {
    const { data } = await apiClient.post<ChunkSummariesResponse>(api('/chunk_summaries/build'), request);
    return data;
  },

  async deleteOne(opts: { corpusId: string; chunkId: string }): Promise<void> {
    const qs = new URLSearchParams({ corpus_id: opts.corpusId });
    await apiClient.delete(api(`/chunk_summaries/${encodeURIComponent(opts.chunkId)}?${qs.toString()}`));
  },
};

