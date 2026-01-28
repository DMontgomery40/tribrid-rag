import { create } from 'zustand';

interface UIState {
  activeTab: string;
  activeSubtabs: Record<string, string>;
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  evalInProgress: boolean;
  evalRunId: string | null;
}

interface UIActions {
  setActiveTab: (tab: string) => void;
  setActiveSubtab: (tab: string, subtab: string) => void;
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setEvalInProgress: (inProgress: boolean, runId?: string) => void;
}

type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>((set) => ({
  activeTab: 'start',
  activeSubtabs: {},
  sidebarOpen: true,
  theme: 'system',
  evalInProgress: false,
  evalRunId: null,

  setActiveTab: (tab) => set({ activeTab: tab }),

  setActiveSubtab: (tab, subtab) =>
    set((state) => ({
      activeSubtabs: { ...state.activeSubtabs, [tab]: subtab },
    })),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setTheme: (theme) => set({ theme }),

  setEvalInProgress: (inProgress, runId) =>
    set({ evalInProgress: inProgress, evalRunId: runId || null }),
}));
