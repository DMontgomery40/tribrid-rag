import { client } from './client';
import type { ServiceStatus } from '../types/ui';

export const check = () =>
  client.get<{ services: Record<string, ServiceStatus> }>('/health');

export const ready = () =>
  client.get<{ ready: boolean }>('/ready');
