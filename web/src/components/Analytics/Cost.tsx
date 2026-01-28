import { useDashboard } from '../../hooks/useDashboard';

export function Cost() {
  const { costSummary } = useDashboard();

  if (!costSummary) {
    return <div className="text-gray-500">No cost data available</div>;
  }

  return (
    <div className="space-y-4">
      <div className="tribrid-card p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h4 className="font-medium mb-2">Total Cost ({costSummary.period})</h4>
        <p className="text-2xl font-bold">${costSummary.total_cost.toFixed(4)}</p>
      </div>

      <div className="tribrid-card p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h4 className="font-medium mb-2">By Operation</h4>
        <ul className="space-y-1">
          {Object.entries(costSummary.by_operation).map(([op, cost]) => (
            <li key={op} className="flex justify-between text-sm">
              <span>{op}</span>
              <span>${cost.toFixed(4)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="tribrid-card p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h4 className="font-medium mb-2">By Repository</h4>
        <ul className="space-y-1">
          {Object.entries(costSummary.by_repo).map(([repo, cost]) => (
            <li key={repo} className="flex justify-between text-sm">
              <span>{repo}</span>
              <span>${cost.toFixed(4)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
