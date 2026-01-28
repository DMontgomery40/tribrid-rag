import { SystemStatus } from './SystemStatus';
import { QuickActions } from './QuickActions';

export function SystemStatusSubtab() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <SystemStatus />
      <QuickActions />
    </div>
  );
}
