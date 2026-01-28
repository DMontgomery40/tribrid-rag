import { create } from 'zustand';
import type { Entity, Relationship, Community, GraphStats } from '../types/generated';

interface GraphState {
  entities: Entity[];
  relationships: Relationship[];
  communities: Community[];
  selectedEntityId: string | null;
  stats: GraphStats | null;
  loading: boolean;
  error: string | null;
}

interface GraphActions {
  fetchEntities: (repoId: string, type?: string) => Promise<void>;
  fetchRelationships: (entityId: string) => Promise<void>;
  fetchCommunities: (repoId: string, level?: number) => Promise<void>;
  fetchStats: (repoId: string) => Promise<void>;
  selectEntity: (entityId: string | null) => void;
  executeQuery: (cypher: string) => Promise<unknown[]>;
}

type GraphStore = GraphState & GraphActions;

export const useGraphStore = create<GraphStore>((set, get) => ({
  entities: [],
  relationships: [],
  communities: [],
  selectedEntityId: null,
  stats: null,
  loading: false,
  error: null,

  fetchEntities: async (repoId, type) => {
    set({ loading: true, error: null });
    try {
      const url = type
        ? `/api/graph/${repoId}/entities?entity_type=${type}`
        : `/api/graph/${repoId}/entities`;
      const res = await fetch(url);
      const entities = await res.json();
      set({ entities, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  fetchRelationships: async (entityId) => {
    set({ loading: true, error: null });
    try {
      const repoId = get().stats?.repo_id;
      if (!repoId) throw new Error('No repo selected');
      const res = await fetch(
        `/api/graph/${repoId}/entity/${entityId}/relationships`
      );
      const relationships = await res.json();
      set({ relationships, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  fetchCommunities: async (repoId, level) => {
    set({ loading: true, error: null });
    try {
      const url = level !== undefined
        ? `/api/graph/${repoId}/communities?level=${level}`
        : `/api/graph/${repoId}/communities`;
      const res = await fetch(url);
      const communities = await res.json();
      set({ communities, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  fetchStats: async (repoId) => {
    try {
      const res = await fetch(`/api/graph/${repoId}/stats`);
      const stats = await res.json();
      set({ stats });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  selectEntity: (entityId) => set({ selectedEntityId: entityId }),

  executeQuery: async (cypher) => {
    const repoId = get().stats?.repo_id;
    if (!repoId) throw new Error('No repo selected');
    const res = await fetch(`/api/graph/${repoId}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cypher }),
    });
    return res.json();
  },
}));
