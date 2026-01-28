import { create } from 'zustand';
import type { Repository } from '../types/generated';

interface RepoState {
  repos: Repository[];
  activeRepoId: string | null;
  loading: boolean;
  error: string | null;
}

interface RepoActions {
  fetchRepos: () => Promise<void>;
  addRepo: (repo: Omit<Repository, 'repo_id' | 'created_at'>) => Promise<void>;
  deleteRepo: (repoId: string) => Promise<void>;
  setActiveRepo: (repoId: string) => void;
  getActiveRepo: () => Repository | null;
}

type RepoStore = RepoState & RepoActions;

export const useRepoStore = create<RepoStore>((set, get) => ({
  repos: [],
  activeRepoId: null,
  loading: false,
  error: null,

  fetchRepos: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/repos');
      const repos = await res.json();
      set({ repos, loading: false });
      if (repos.length > 0 && !get().activeRepoId) {
        set({ activeRepoId: repos[0].repo_id });
      }
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  addRepo: async (repo) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/repos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(repo),
      });
      const newRepo = await res.json();
      set((state) => ({
        repos: [...state.repos, newRepo],
        loading: false,
      }));
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  deleteRepo: async (repoId) => {
    await fetch(`/api/repos/${repoId}`, { method: 'DELETE' });
    set((state) => ({
      repos: state.repos.filter((r) => r.repo_id !== repoId),
      activeRepoId:
        state.activeRepoId === repoId ? null : state.activeRepoId,
    }));
  },

  setActiveRepo: (repoId) => set({ activeRepoId: repoId }),

  getActiveRepo: () => {
    const { repos, activeRepoId } = get();
    return repos.find((r) => r.repo_id === activeRepoId) || null;
  },
}));
