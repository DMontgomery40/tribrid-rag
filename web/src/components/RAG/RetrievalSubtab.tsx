import { FusionWeightsPanel } from './FusionWeightsPanel';
import { useConfig } from '../../hooks/useConfig';

export function RetrievalSubtab() {
  const { config } = useConfig();

  // Get search configs with defaults
  const vectorSearch = config?.vector_search ?? { enabled: true, top_k: 50, similarity_threshold: 0 };
  const sparseSearch = config?.sparse_search ?? { enabled: true, top_k: 50, bm25_k1: 1.2, bm25_b: 0.4 };
  const graphSearch = config?.graph_search ?? { enabled: true, max_hops: 2, include_communities: true, top_k: 30 };

  return (
    <div className="space-y-4">
      <FusionWeightsPanel />

      <div className="tribrid-card p-4 bg-white dark:bg-gray-800 rounded-lg shadow" data-testid="search-config-panel">
        <h4 className="font-medium mb-4">Search Configuration</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div data-testid="vector-search-panel">
            <h5 className="text-sm font-medium mb-2">Vector Search</h5>
            <dl className="text-sm space-y-1">
              <div className="flex justify-between">
                <dt className="text-gray-500">Enabled</dt>
                <dd data-testid="vector-search-enabled">{vectorSearch.enabled ? 'Yes' : 'No'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Top K</dt>
                <dd data-testid="vector-search-top-k">{vectorSearch.top_k}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Threshold</dt>
                <dd data-testid="vector-search-threshold">{vectorSearch.similarity_threshold}</dd>
              </div>
            </dl>
          </div>

          <div data-testid="sparse-search-panel">
            <h5 className="text-sm font-medium mb-2">Sparse Search</h5>
            <dl className="text-sm space-y-1">
              <div className="flex justify-between">
                <dt className="text-gray-500">Enabled</dt>
                <dd data-testid="sparse-search-enabled">{sparseSearch.enabled ? 'Yes' : 'No'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Top K</dt>
                <dd data-testid="sparse-search-top-k">{sparseSearch.top_k}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">BM25 K1</dt>
                <dd data-testid="sparse-search-k1">{sparseSearch.bm25_k1}</dd>
              </div>
            </dl>
          </div>

          <div data-testid="graph-search-panel">
            <h5 className="text-sm font-medium mb-2">Graph Search</h5>
            <dl className="text-sm space-y-1">
              <div className="flex justify-between">
                <dt className="text-gray-500">Enabled</dt>
                <dd data-testid="graph-search-enabled">{graphSearch.enabled ? 'Yes' : 'No'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Max Hops</dt>
                <dd data-testid="graph-search-max-hops">{graphSearch.max_hops}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Communities</dt>
                <dd data-testid="graph-search-communities">{graphSearch.include_communities ? 'Yes' : 'No'}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
