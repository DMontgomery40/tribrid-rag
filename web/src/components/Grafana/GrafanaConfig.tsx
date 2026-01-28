import { useState } from 'react';
import { useConfig } from '../../hooks/useConfig';
import { Button } from '../ui/Button';

export function GrafanaConfig() {
  const { config, updateConfig } = useConfig();
  const [url, setUrl] = useState(config?.observability.grafana_url || '');

  const handleSave = async () => {
    await updateConfig({
      observability: {
        ...config!.observability,
        grafana_url: url || null,
      },
    });
  };

  return (
    <div className="tribrid-card p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h4 className="font-medium mb-4">Grafana Configuration</h4>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Grafana URL</label>
          <input
            type="text"
            className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            placeholder="http://localhost:3000"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        <Button onClick={handleSave}>Save</Button>
      </div>
    </div>
  );
}
