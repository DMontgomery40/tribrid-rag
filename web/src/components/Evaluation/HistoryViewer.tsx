import { useEvalHistory } from '../../hooks/useEvalHistory';
import { useEffect } from 'react';
import { Button } from '../ui/Button';

export function HistoryViewer({ repoId }: { repoId?: string }) {
  const { runs, loading, fetchRuns, selectRun, deleteRun, selectedRun } = useEvalHistory();

  useEffect(() => {
    fetchRuns(repoId);
  }, [repoId, fetchRuns]);

  return (
    <div className="tribrid-card p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h4 className="font-medium mb-4">Evaluation History</h4>
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : runs.length === 0 ? (
        <p className="text-gray-500">No evaluation runs yet</p>
      ) : (
        <div className="space-y-2">
          {runs.map((run) => (
            <div
              key={run.run_id}
              className={`p-3 border rounded cursor-pointer ${
                selectedRun?.run_id === run.run_id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'dark:border-gray-700'
              }`}
              onClick={() => selectRun(run.run_id)}
            >
              <div className="flex justify-between">
                <div>
                  <div className="font-medium text-sm">
                    MRR: {run.metrics.mrr.toFixed(3)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(run.completed_at).toLocaleString()}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteRun(run.run_id);
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
