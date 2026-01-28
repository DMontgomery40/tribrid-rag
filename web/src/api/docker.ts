import { client } from './client';
import type { ContainerStatus } from '../types/ui';

export const getStatus = () =>
  client.get<Record<string, ContainerStatus>>('/docker/status');

export const restart = (container: string) =>
  client.post<{ success: boolean }>(`/docker/${container}/restart`);

export const getLogs = (container: string, lines = 100) =>
  client.get<string[]>(`/docker/${container}/logs?lines=${lines}`);
