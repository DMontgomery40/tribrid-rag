import { FusionWeightsPanel } from './FusionWeightsPanel';
import { useConfig } from '../../hooks/useConfig';

export function RetrievalSubtab() {
  const { config } = useConfig();

  return (
    <div className="space-y-4">
      <FusionWeightsPanel />

      <div className="tribrid-card p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h4 className="font-medium mb-4">Search Configuration</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h5 className="text-sm font-medium mb-2">Vector Search</h5>
            <dl className="text-sm space-y-1">
              <div className="flex justify-between">
                <dt className="text-gray-500">Enabled</dt>
                <dd>{config?.vector_search.enabled ? 'Yes' : 'No'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Top K</dt>
                <dd>{config?.vector_search.top_k}</dd>
              </div>
            </dl>
          </div>

          <div>
            <h5 className="text-sm font-medium mb-2">Sparse Search</h5>
            <dl className="text-sm space-y-1">
              <div className="flex justify-between">
                <dt className="text-gray-500">Enabled</dt>
                <dd>{config?.sparse_search.enabled ? 'Yes' : 'No'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Top K</dt>
                <dd>{config?.sparse_search.top_k}</dd>
              </div>
            </dl>
          </div>

          <div>
            <h5 className="text-sm font-medium mb-2">Graph Search</h5>
            <dl className="text-sm space-y-1">
              <div className="flex justify-between">
                <dt className="text-gray-500">Enabled</dt>
                <dd>{config?.graph_search.enabled ? 'Yes' : 'No'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Max Hops</dt>
                <dd>{config?.graph_search.max_hops}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
