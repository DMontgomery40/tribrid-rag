import { useIndexing } from '../../hooks/useIndexing';
import { useRepoStore } from '../../stores';
import { useEffect } from 'react';

export function StorageSubtab() {
  const activeRepoId = useRepoStore((s) => s.activeRepoId);
  const { stats, refreshStats } = useIndexing();

  useEffect(() => {
    if (activeRepoId) {
      refreshStats(activeRepoId);
    }
  }, [activeRepoId, refreshStats]);

  if (!stats) {
    return <div className="text-gray-500">Select a repository to view storage stats</div>;
  }

  return (
    <div className="space-y-4">
      <div className="tribrid-card p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h4 className="font-medium mb-2">Index Statistics</h4>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Total Files</dt>
            <dd className="font-medium">{stats.total_files}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Total Chunks</dt>
            <dd className="font-medium">{stats.total_chunks}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Total Tokens</dt>
            <dd className="font-medium">{stats.total_tokens.toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Embedding Model</dt>
            <dd className="font-medium">{stats.embedding_model}</dd>
          </div>
        </dl>
      </div>

      <div className="tribrid-card p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h4 className="font-medium mb-2">File Breakdown</h4>
        <ul className="space-y-1 text-sm">
          {Object.entries(stats.file_breakdown).map(([ext, count]) => (
            <li key={ext} className="flex justify-between">
              <span>{ext}</span>
              <span className="text-gray-500">{count}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
