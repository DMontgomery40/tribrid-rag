import { apiClient, api } from './client';
import type { KeywordsGenerateRequest, KeywordsGenerateResponse } from '@/types/generated';

export const keywordsApi = {
  async generate(request: KeywordsGenerateRequest): Promise<KeywordsGenerateResponse> {
    const { data } = await apiClient.post<KeywordsGenerateResponse>(api('/keywords/generate'), request);
    return data;
  },
};

