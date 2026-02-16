import { apiClient, api, withCorpusScope } from './client';

export const modelsApi = {
  /**
   * Full model catalog.
   * Response shape is not yet modeled in Pydantic/types, so return `unknown`.
   */
  async listAll(): Promise<unknown> {
    const { data } = await apiClient.get(withCorpusScope(api('/models')));
    return data as unknown;
  },

  /**
   * Legacy model catalog endpoint used by some UI panels.
   * Response shape is not yet modeled in Pydantic/types, so return `unknown`.
   */
  async listByType(type: string): Promise<unknown> {
    const { data } = await apiClient.get(withCorpusScope(api(`/models/by-type/${encodeURIComponent(type)}`)));
    return data as unknown;
  },
};
