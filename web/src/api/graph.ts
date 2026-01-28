import { client } from './client';
import type { Entity, Relationship, Community, GraphStats } from '../types/generated';

export const listEntities = (repoId: string, type?: string, limit = 100) => {
  const params = new URLSearchParams({ limit: limit.toString() });
  if (type) params.set('entity_type', type);
  return client.get<Entity[]>(`/graph/${repoId}/entities?${params}`);
};

export const getEntity = (repoId: string, entityId: string) =>
  client.get<Entity>(`/graph/${repoId}/entity/${entityId}`);

export const getRelationships = (repoId: string, entityId: string) =>
  client.get<Relationship[]>(`/graph/${repoId}/entity/${entityId}/relationships`);

export const listCommunities = (repoId: string, level?: number) => {
  const params = level !== undefined ? `?level=${level}` : '';
  return client.get<Community[]>(`/graph/${repoId}/communities${params}`);
};

export const getStats = (repoId: string) =>
  client.get<GraphStats>(`/graph/${repoId}/stats`);

export const query = (repoId: string, cypher: string) =>
  client.post<Record<string, unknown>[]>(`/graph/${repoId}/query`, { cypher });
