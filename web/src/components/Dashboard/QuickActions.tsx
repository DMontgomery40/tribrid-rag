import { useIndexing } from '../../hooks/useIndexing';
import { useRepoStore, useHealthStore } from '../../stores';
import { Button } from '../ui/Button';

export function QuickActions() {
  const activeRepoId = useRepoStore((s) => s.activeRepoId);
  const { startIndex, status } = useIndexing();
  const { checkHealth } = useHealthStore();

  const handleReindex = async () => {
    if (activeRepoId) {
      await startIndex(activeRepoId, true);
    }
  };

  return (
    <div className="tribrid-card p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h3 className="font-medium mb-4">Quick Actions</h3>
      <div className="space-y-2">
        <Button
          variant="secondary"
          onClick={handleReindex}
          disabled={!activeRepoId || status?.status === 'indexing'}
        >
          Re-index Repository
        </Button>
        <Button variant="secondary" onClick={checkHealth}>
          Refresh Health
        </Button>
      </div>
    </div>
  );
}
