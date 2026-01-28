import { create } from 'zustand';
import type { ServiceStatus, ContainerStatus } from '../types/ui';

interface HealthState {
  healthy: boolean;
  services: Record<string, ServiceStatus>;
  docker: Record<string, ContainerStatus>;
  lastCheck: Date | null;
  checking: boolean;
}

interface HealthActions {
  checkHealth: () => Promise<void>;
  checkDocker: () => Promise<void>;
  restartContainer: (name: string) => Promise<void>;
}

type HealthStore = HealthState & HealthActions;

export const useHealthStore = create<HealthStore>((set, get) => ({
  healthy: false,
  services: {},
  docker: {},
  lastCheck: null,
  checking: false,

  checkHealth: async () => {
    set({ checking: true });
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      const services = data.services || {};
      const healthy = Object.values(services).every(
        (s) => (s as ServiceStatus).healthy
      );
      set({ services, healthy, lastCheck: new Date(), checking: false });
    } catch {
      set({ healthy: false, checking: false });
    }
  },

  checkDocker: async () => {
    try {
      const res = await fetch('/api/docker/status');
      const docker = await res.json();
      set({ docker });
    } catch {
      // Docker status optional
    }
  },

  restartContainer: async (name) => {
    await fetch(`/api/docker/${name}/restart`, { method: 'POST' });
    await get().checkDocker();
  },
}));
