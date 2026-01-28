import { DashboardSubtabs } from '../Dashboard/DashboardSubtabs';

export function StartTab() {
  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Dashboard</h2>
      <DashboardSubtabs />
    </div>
  );
}
