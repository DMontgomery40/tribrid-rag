import { create } from 'zustand';
import { configApi } from '@/api/config';
import type { TriBridConfig } from '@/types/generated';

interface ConfigStore {
  config: TriBridConfig | null;
  loading: boolean;
  error: string | null;
  saving: boolean;

  // Actions
  loadConfig: () => Promise<void>;
  saveConfig: (config: TriBridConfig) => Promise<void>;
  patchSection: (section: keyof TriBridConfig, updates: Record<string, unknown>) => Promise<void>;
  resetConfig: () => Promise<void>;

  reset: () => void;
}

export const useConfigStore = create<ConfigStore>((set, get) => ({
  config: null,
  loading: false,
  error: null,
  saving: false,

  loadConfig: async () => {
    set({ loading: true, error: null });
    try {
      const config = await configApi.load();
      set({ config, loading: false, error: null });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load configuration',
      });
    }
  },

  saveConfig: async (config: TriBridConfig) => {
    set({ saving: true, error: null });
    try {
      const saved = await configApi.save(config);
      set({ config: saved, saving: false, error: null });
    } catch (error) {
      set({
        saving: false,
        error: error instanceof Error ? error.message : 'Failed to save configuration',
      });
    }
  },

  patchSection: async (section: keyof TriBridConfig, updates: Record<string, unknown>) => {
    set({ saving: true, error: null });
    try {
      const saved = await configApi.patchSection(String(section), updates);
      set({ config: saved, saving: false, error: null });
    } catch (error) {
      set({
        saving: false,
        error: error instanceof Error ? error.message : 'Failed to save configuration',
      });
    }
  },

  resetConfig: async () => {
    set({ saving: true, error: null });
    try {
      const saved = await configApi.reset();
      set({ config: saved, saving: false, error: null });
    } catch (error) {
      set({
        saving: false,
        error: error instanceof Error ? error.message : 'Failed to reset configuration',
      });
    }
  },

  reset: () =>
    set({
      config: null,
      loading: false,
      error: null,
      saving: false,
    }),
}));
