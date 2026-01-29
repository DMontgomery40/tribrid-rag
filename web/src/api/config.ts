import { client } from './client';
import type { TRIBRIDConfig } from '../types/generated';

export const get = () =>
  client.get<TRIBRIDConfig>('/config');

export const update = (config: TRIBRIDConfig) =>
  client.put<TRIBRIDConfig>('/config', config);

export const updateSection = <K extends keyof TRIBRIDConfig>(
  section: K,
  updates: Partial<TRIBRIDConfig[K]>
) =>
  client.patch<TRIBRIDConfig>(`/config/${section}`, updates);

export const reset = () =>
  client.post<TRIBRIDConfig>('/config/reset');
