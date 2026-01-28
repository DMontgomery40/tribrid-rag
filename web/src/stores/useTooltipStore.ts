import { create } from 'zustand';
import type { TooltipEntry } from '../types/ui';

interface TooltipState {
  tooltips: Record<string, TooltipEntry>;
  glossary: TooltipEntry[];
  searchQuery: string;
  filteredGlossary: TooltipEntry[];
}

interface TooltipActions {
  registerTooltip: (entry: TooltipEntry) => void;
  setSearchQuery: (query: string) => void;
  getTooltip: (id: string) => TooltipEntry | null;
}

type TooltipStore = TooltipState & TooltipActions;

export const useTooltipStore = create<TooltipStore>((set, get) => ({
  tooltips: {},
  glossary: [],
  searchQuery: '',
  filteredGlossary: [],

  registerTooltip: (entry) =>
    set((state) => {
      const tooltips = { ...state.tooltips, [entry.id]: entry };
      const glossary = Object.values(tooltips).sort((a, b) =>
        a.term.localeCompare(b.term)
      );
      return {
        tooltips,
        glossary,
        filteredGlossary: filterGlossary(glossary, state.searchQuery),
      };
    }),

  setSearchQuery: (query) =>
    set((state) => ({
      searchQuery: query,
      filteredGlossary: filterGlossary(state.glossary, query),
    })),

  getTooltip: (id) => get().tooltips[id] || null,
}));

function filterGlossary(glossary: TooltipEntry[], query: string): TooltipEntry[] {
  if (!query) return glossary;
  const lower = query.toLowerCase();
  return glossary.filter(
    (e) =>
      e.term.toLowerCase().includes(lower) ||
      e.definition.toLowerCase().includes(lower)
  );
}
