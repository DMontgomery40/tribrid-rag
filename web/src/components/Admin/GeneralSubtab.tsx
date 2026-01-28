import { useConfig } from '../../hooks/useConfig';
import { Button } from '../ui/Button';

export function GeneralSubtab() {
  const { config, resetConfig } = useConfig();

  return (
    <div className="space-y-6">
      <div className="tribrid-panel p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Configuration Management</h3>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Reset all configuration to default values.
            </p>
            <Button variant="danger" onClick={resetConfig} className="mt-2">
              Reset to Defaults
            </Button>
          </div>
        </div>
      </div>

      {config && (
        <div className="tribrid-panel p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Current Configuration</h3>
          <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto max-h-96">
            {JSON.stringify(config, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
