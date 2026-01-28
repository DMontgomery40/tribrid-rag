import { useConfig } from '../../hooks/useConfig';

export function RerankerConfigSubtab() {
  const { config } = useConfig();
  const reranker = config?.reranker;

  if (!reranker) return null;

  return (
    <div className="tribrid-card p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h4 className="font-medium mb-4">Reranker Configuration</h4>
      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-gray-500">Mode</dt>
          <dd className="font-medium">{reranker.mode}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Top N</dt>
          <dd className="font-medium">{reranker.top_n}</dd>
        </div>
        {reranker.mode === 'local' && (
          <div className="col-span-2">
            <dt className="text-gray-500">Local Model</dt>
            <dd className="font-medium">{reranker.local_model}</dd>
          </div>
        )}
        {reranker.mode === 'trained' && (
          <div className="col-span-2">
            <dt className="text-gray-500">Trained Model Path</dt>
            <dd className="font-medium">{reranker.trained_model_path}</dd>
          </div>
        )}
        {reranker.mode === 'api' && (
          <>
            <div>
              <dt className="text-gray-500">API Provider</dt>
              <dd className="font-medium">{reranker.api_provider}</dd>
            </div>
            <div>
              <dt className="text-gray-500">API Model</dt>
              <dd className="font-medium">{reranker.api_model}</dd>
            </div>
          </>
        )}
      </dl>
    </div>
  );
}
