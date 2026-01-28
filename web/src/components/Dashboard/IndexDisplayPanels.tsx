import { useIndexing } from '../../hooks/useIndexing';
import { ProgressBar } from '../ui/ProgressBar';

export function IndexDisplayPanels() {
  const { status, stats } = useIndexing();

  return (
    <div className="space-y-4">
      {status && (
        <div className="tribrid-card p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
          <h4 className="font-medium mb-2">Indexing Status</h4>
          <ProgressBar
            progress={status.progress * 100}
            label={status.current_file || status.status}
            variant={status.status === 'error' ? 'error' : 'default'}
          />
          {status.error && (
            <p className="mt-2 text-sm text-red-600">{status.error}</p>
          )}
        </div>
      )}

      {stats && (
        <div className="tribrid-card p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
          <h4 className="font-medium mb-2">Index Stats</h4>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-gray-500">Files</dt>
              <dd>{stats.total_files}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Chunks</dt>
              <dd>{stats.total_chunks}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
