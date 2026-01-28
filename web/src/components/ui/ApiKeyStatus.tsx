import { StatusIndicator } from './StatusIndicator';

export function ApiKeyStatus() {
  // API key status would be fetched from config
  const hasKey = true; // Placeholder

  return (
    <div className="flex items-center gap-2">
      <StatusIndicator status={hasKey ? 'healthy' : 'error'} />
      <span className="text-sm">{hasKey ? 'API Key configured' : 'API Key missing'}</span>
    </div>
  );
}
