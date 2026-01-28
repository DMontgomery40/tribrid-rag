import { useRepoStore } from '../../stores';
import { ChunkSummaryPanel } from './ChunkSummaryPanel';

export function DataQualitySubtab() {
  const activeRepoId = useRepoStore((s) => s.activeRepoId);

  if (!activeRepoId) {
    return <div className="text-gray-500">Select a repository to view data quality</div>;
  }

  return (
    <div className="space-y-4">
      <ChunkSummaryPanel repoId={activeRepoId} />
    </div>
  );
}
