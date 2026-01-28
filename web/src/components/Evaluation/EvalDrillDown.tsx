import type { EvalRun } from '../../types/generated';

interface EvalDrillDownProps {
  run: EvalRun;
}

export function EvalDrillDown({ run }: EvalDrillDownProps) {
  return (
    <div className="space-y-4">
      <div className="tribrid-card p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h4 className="font-medium mb-2">Metrics</h4>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">MRR</dt>
            <dd className="font-medium">{run.metrics.mrr.toFixed(3)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Recall@5</dt>
            <dd className="font-medium">{run.metrics.recall_at_5.toFixed(3)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Recall@10</dt>
            <dd className="font-medium">{run.metrics.recall_at_10.toFixed(3)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">NDCG@10</dt>
            <dd className="font-medium">{run.metrics.ndcg_at_10.toFixed(3)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">P50 Latency</dt>
            <dd className="font-medium">{run.metrics.latency_p50_ms.toFixed(0)}ms</dd>
          </div>
          <div>
            <dt className="text-gray-500">P95 Latency</dt>
            <dd className="font-medium">{run.metrics.latency_p95_ms.toFixed(0)}ms</dd>
          </div>
        </dl>
      </div>

      <div className="tribrid-card p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h4 className="font-medium mb-2">Results ({run.results.length})</h4>
        <div className="max-h-96 overflow-y-auto space-y-2">
          {run.results.map((result) => (
            <div
              key={result.entry_id}
              className="p-2 border rounded dark:border-gray-700"
            >
              <div className="font-medium text-sm">{result.question}</div>
              <div className="text-xs text-gray-500 mt-1">
                RR: {result.reciprocal_rank.toFixed(2)} | Recall: {result.recall.toFixed(2)} | {result.latency_ms.toFixed(0)}ms
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
