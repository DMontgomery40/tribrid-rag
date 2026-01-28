import { useTooltipStore } from '../stores';
import type { TooltipEntry } from '../types/ui';

export function useTooltips() {
  const getTooltip = useTooltipStore((s) => s.getTooltip);
  const registerTooltip = useTooltipStore((s) => s.registerTooltip);
  const filteredGlossary = useTooltipStore((s) => s.filteredGlossary);
  const setSearchQuery = useTooltipStore((s) => s.setSearchQuery);

  const searchGlossary = (query: string): TooltipEntry[] => {
    setSearchQuery(query);
    return filteredGlossary;
  };

  return {
    getTooltip,
    registerTooltip,
    searchGlossary,
  };
}
