import { useIndexing } from '../../hooks/useIndexing';
import { useRepoStore } from '../../stores';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';
import { IndexStatsPanel } from './IndexStatsPanel';

export function IndexingSubtab() {
  const activeRepoId = useRepoStore((s) => s.activeRepoId);
  const { status, startIndex } = useIndexing();

  const handleIndex = async () => {
    if (activeRepoId) {
      await startIndex(activeRepoId);
    }
  };

  return (
    <div className="space-y-4">
      <div className="tribrid-card p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h4 className="font-medium mb-4">Start Indexing</h4>
        {status && status.status === 'indexing' && (
          <div className="mb-4">
            <ProgressBar
              progress={status.progress * 100}
              label={status.current_file || 'Indexing...'}
            />
          </div>
        )}
        <div className="flex gap-2">
          <Button
            onClick={handleIndex}
            disabled={!activeRepoId || status?.status === 'indexing'}
            loading={status?.status === 'indexing'}
          >
            Index Repository
          </Button>
          <Button
            variant="secondary"
            onClick={() => activeRepoId && startIndex(activeRepoId, true)}
            disabled={!activeRepoId || status?.status === 'indexing'}
          >
            Force Re-index
          </Button>
        </div>
      </div>

      {activeRepoId && <IndexStatsPanel repoId={activeRepoId} />}
    </div>
  );
}
