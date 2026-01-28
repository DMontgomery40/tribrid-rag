import { useReranker } from '../../hooks/useReranker';
import { Button } from '../ui/Button';

export function LearningRerankerSubtab() {
  const { status, tripletCount, trainModel, promoteModel, refreshStatus } = useReranker();

  return (
    <div className="space-y-4">
      <div className="tribrid-card p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h4 className="font-medium mb-4">Learning Reranker Status</h4>
        <dl className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <dt className="text-gray-500">Mode</dt>
            <dd className="font-medium">{status.mode}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Model Loaded</dt>
            <dd className="font-medium">{status.model_loaded ? 'Yes' : 'No'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Triplets Available</dt>
            <dd className="font-medium">{tripletCount}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Last Trained</dt>
            <dd className="font-medium">
              {status.last_trained
                ? new Date(status.last_trained).toLocaleString()
                : 'Never'}
            </dd>
          </div>
        </dl>
        <div className="flex gap-2">
          <Button onClick={trainModel} disabled={tripletCount < 10}>
            Train Model
          </Button>
          <Button
            variant="secondary"
            onClick={() => status.model_path && promoteModel(status.model_path)}
            disabled={!status.model_path}
          >
            Promote to Production
          </Button>
          <Button variant="ghost" onClick={refreshStatus}>
            Refresh
          </Button>
        </div>
      </div>
    </div>
  );
}
