import { apiClient, api } from './client';

export const promptsApi = {
  /**
   * System prompts editor API.
   * NOTE: Response/request shapes are not yet modeled in Pydantic/types.
   */
  async list(): Promise<unknown> {
    const { data } = await apiClient.get(api('/prompts'));
    return data as unknown;
  },

  async update(promptKey: string, value: string): Promise<unknown> {
    const { data } = await apiClient.put(api(`/prompts/${encodeURIComponent(promptKey)}`), { value });
    return data as unknown;
  },

  async reset(promptKey: string): Promise<unknown> {
    const { data } = await apiClient.post(api(`/prompts/reset/${encodeURIComponent(promptKey)}`));
    return data as unknown;
  },
};

