import { useHealthStore } from '../../stores';
import { StatusIndicator } from '../ui/StatusIndicator';

export function ServicesSubtab() {
  const services = useHealthStore((s) => s.services);

  const serviceList = Object.entries(services);

  return (
    <div className="space-y-2">
      <h4 className="font-medium mb-4">Service Health</h4>
      {serviceList.length === 0 ? (
        <p className="text-gray-500">No services configured</p>
      ) : (
        serviceList.map(([name, status]) => (
          <div
            key={name}
            className="tribrid-card p-4 bg-white dark:bg-gray-800 rounded-lg shadow flex justify-between items-center"
          >
            <div className="flex items-center gap-4">
              <StatusIndicator status={status.healthy ? 'healthy' : 'error'} />
              <div>
                <div className="font-medium">{status.name}</div>
                {status.error && (
                  <div className="text-sm text-red-500">{status.error}</div>
                )}
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {status.latency_ms}ms
            </div>
          </div>
        ))
      )}
    </div>
  );
}
