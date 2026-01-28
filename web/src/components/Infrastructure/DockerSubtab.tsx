import { useEffect } from 'react';
import { useHealthStore } from '../../stores';
import { StatusIndicator } from '../ui/StatusIndicator';
import { Button } from '../ui/Button';

export function DockerSubtab() {
  const docker = useHealthStore((s) => s.docker);
  const checkDocker = useHealthStore((s) => s.checkDocker);
  const restartContainer = useHealthStore((s) => s.restartContainer);

  useEffect(() => {
    checkDocker();
  }, [checkDocker]);

  const containers = Object.entries(docker);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-medium">Docker Containers</h4>
        <Button variant="secondary" size="sm" onClick={checkDocker}>
          Refresh
        </Button>
      </div>

      {containers.length === 0 ? (
        <p className="text-gray-500">No containers found</p>
      ) : (
        <div className="space-y-2">
          {containers.map(([name, status]) => (
            <div
              key={name}
              className="tribrid-card p-4 bg-white dark:bg-gray-800 rounded-lg shadow flex justify-between items-center"
            >
              <div className="flex items-center gap-4">
                <StatusIndicator
                  status={status.status === 'running' ? 'healthy' : 'error'}
                />
                <div>
                  <div className="font-medium">{name}</div>
                  <div className="text-sm text-gray-500">
                    {status.uptime || status.status}
                    {status.memory_mb && ` | ${status.memory_mb}MB`}
                  </div>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => restartContainer(name)}
              >
                Restart
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
