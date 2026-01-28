import { useEffect } from 'react';
import { useIndexing } from '../../hooks/useIndexing';

interface IndexStatsPanelProps {
  repoId: string;
}

export function IndexStatsPanel({ repoId }: IndexStatsPanelProps) {
  const { stats, refreshStats } = useIndexing();

  useEffect(() => {
    refreshStats(repoId);
  }, [repoId, refreshStats]);

  if (!stats) {
    return <div className="text-gray-500">Loading stats...</div>;
  }

  return (
    <div className="tribrid-card p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h4 className="font-medium mb-4">Index Statistics</h4>
      <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <dt className="text-gray-500">Files</dt>
          <dd className="font-medium text-lg">{stats.total_files}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Chunks</dt>
          <dd className="font-medium text-lg">{stats.total_chunks}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Tokens</dt>
          <dd className="font-medium text-lg">{stats.total_tokens.toLocaleString()}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Dimensions</dt>
          <dd className="font-medium text-lg">{stats.embedding_dimensions}</dd>
        </div>
      </dl>
      <div className="mt-4 text-sm text-gray-500">
        Model: {stats.embedding_model}
        {stats.last_indexed && (
          <> | Last indexed: {new Date(stats.last_indexed).toLocaleString()}</>
        )}
      </div>
    </div>
  );
}
