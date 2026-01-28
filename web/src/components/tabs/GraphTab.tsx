import { useRepoStore } from '../../stores';
import { GraphExplorer } from '../Graph/GraphExplorer';

export function GraphTab() {
  const activeRepoId = useRepoStore((s) => s.activeRepoId);

  if (!activeRepoId) {
    return (
      <div className="p-4 text-gray-500">
        Select a repository to explore the knowledge graph
      </div>
    );
  }

  return (
    <div className="p-4 h-full">
      <h2 className="text-xl font-semibold mb-4">Knowledge Graph</h2>
      <GraphExplorer repoId={activeRepoId} />
    </div>
  );
}
