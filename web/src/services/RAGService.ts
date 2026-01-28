import { client } from '../api/client';
import type { SearchRequest, SearchResponse, AnswerRequest, AnswerResponse } from '../types/generated';

export const RAGService = {
  async search(request: SearchRequest): Promise<SearchResponse> {
    return client.post('/search', request);
  },

  async answer(request: AnswerRequest): Promise<AnswerResponse> {
    return client.post('/answer', request);
  },

  async streamAnswer(request: AnswerRequest, onChunk: (chunk: string) => void): Promise<void> {
    return client.stream('/answer/stream', request, onChunk);
  },
};
