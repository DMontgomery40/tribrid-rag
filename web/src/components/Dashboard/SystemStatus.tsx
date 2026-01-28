import { useDashboard } from '../../hooks/useDashboard';
import { StatusIndicator } from '../ui/StatusIndicator';

export function SystemStatus() {
  const { systemStatus } = useDashboard();

  const services = [
    { name: 'PostgreSQL', status: systemStatus.postgres },
    { name: 'Neo4j', status: systemStatus.neo4j },
    { name: 'API', status: systemStatus.api },
  ];

  return (
    <div className="tribrid-card p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h3 className="font-medium mb-4">System Status</h3>
      <div className="space-y-3">
        {services.map((svc) => (
          <div key={svc.name} className="flex items-center justify-between">
            <span>{svc.name}</span>
            <div className="flex items-center gap-2">
              <StatusIndicator
                status={svc.status.healthy ? 'healthy' : 'error'}
                label={svc.status.healthy ? 'Healthy' : 'Error'}
              />
              {svc.status.latency_ms > 0 && (
                <span className="text-xs text-gray-400">
                  {svc.status.latency_ms}ms
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
