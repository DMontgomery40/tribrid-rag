import { useConfig } from '../../hooks/useConfig';

interface GrafanaDashboardProps {
  dashboardId?: string;
}

export function GrafanaDashboard({ dashboardId }: GrafanaDashboardProps) {
  const { config } = useConfig();
  const grafanaUrl = config?.observability.grafana_url;

  if (!grafanaUrl) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>Grafana URL not configured</p>
        <p className="text-sm mt-2">Set grafana_url in observability config</p>
      </div>
    );
  }

  const src = dashboardId
    ? `${grafanaUrl}/d/${dashboardId}?kiosk`
    : `${grafanaUrl}?kiosk`;

  return (
    <div className="h-full">
      <iframe
        src={src}
        className="w-full h-full border-0"
        title="Grafana Dashboard"
      />
    </div>
  );
}
