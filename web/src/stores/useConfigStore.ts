import { create } from 'zustand';
import type { TriBridConfig } from '../types/generated';

interface ConfigState {
  config: TriBridConfig | null;
  loading: boolean;
  error: string | null;
  dirty: boolean;
}

interface ConfigActions {
  fetchConfig: () => Promise<void>;
  updateConfig: (config: Partial<TriBridConfig>) => Promise<void>;
  updateSection: <K extends keyof TriBridConfig>(
    section: K,
    updates: Partial<TriBridConfig[K]>
  ) => Promise<void>;
  resetConfig: () => Promise<void>;
  setDirty: (dirty: boolean) => void;
}

type ConfigStore = ConfigState & ConfigActions;

export const useConfigStore = create<ConfigStore>((set, get) => ({
  config: null,
  loading: false,
  error: null,
  dirty: false,

  fetchConfig: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/config');
      const config = await res.json();
      set({ config, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  updateConfig: async (updates) => {
    const current = get().config;
    if (!current) return;
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...current, ...updates }),
      });
      const config = await res.json();
      set({ config, loading: false, dirty: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  updateSection: async (section, updates) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/config/${section}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const config = await res.json();
      set({ config, loading: false, dirty: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  resetConfig: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/config/reset', { method: 'POST' });
      const config = await res.json();
      set({ config, loading: false, dirty: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  setDirty: (dirty) => set({ dirty }),
}));
