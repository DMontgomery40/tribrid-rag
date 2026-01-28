import { useDashboard } from '../../hooks/useDashboard';

export function IndexingCostsPanel() {
  const { costSummary } = useDashboard();

  const indexCost = costSummary?.by_operation['index'] ?? 0;

  return (
    <div className="tribrid-card p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h4 className="font-medium mb-2">Indexing Costs</h4>
      <p className="text-2xl font-bold">${indexCost.toFixed(4)}</p>
      <p className="text-sm text-gray-500">This {costSummary?.period || 'month'}</p>
    </div>
  );
}
