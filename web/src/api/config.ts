import { client } from './client';
import type { TriBridConfig } from '../types/generated';

export const get = () =>
  client.get<TriBridConfig>('/config');

export const update = (config: TriBridConfig) =>
  client.put<TriBridConfig>('/config', config);

export const updateSection = <K extends keyof TriBridConfig>(
  section: K,
  updates: Partial<TriBridConfig[K]>
) =>
  client.patch<TriBridConfig>(`/config/${section}`, updates);

export const reset = () =>
  client.post<TriBridConfig>('/config/reset');
