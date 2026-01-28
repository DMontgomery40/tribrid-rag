import { useConfig } from '../../hooks/useConfig';

export function GraphConfigPanel() {
  const { config } = useConfig();
  const graphConfig = config?.graph_search;

  if (!graphConfig) return null;

  return (
    <div className="tribrid-card p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h4 className="font-medium mb-4">Graph Search Config</h4>
      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-gray-500">Enabled</dt>
          <dd className="font-medium">{graphConfig.enabled ? 'Yes' : 'No'}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Max Hops</dt>
          <dd className="font-medium">{graphConfig.max_hops}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Top K</dt>
          <dd className="font-medium">{graphConfig.top_k}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Include Communities</dt>
          <dd className="font-medium">{graphConfig.include_communities ? 'Yes' : 'No'}</dd>
        </div>
      </dl>
    </div>
  );
}
