import { useConfig } from '../../hooks/useConfig';

export function EmbeddingConfigPanel() {
  const { config } = useConfig();

  if (!config) return null;

  return (
    <div className="tribrid-card p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h4 className="font-medium mb-4">Embedding Configuration</h4>
      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-gray-500">Provider</dt>
          <dd className="font-medium">{config.embedding.provider}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Model</dt>
          <dd className="font-medium">{config.embedding.model}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Dimensions</dt>
          <dd className="font-medium">{config.embedding.dimensions}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Batch Size</dt>
          <dd className="font-medium">{config.embedding.batch_size}</dd>
        </div>
      </dl>
    </div>
  );
}
