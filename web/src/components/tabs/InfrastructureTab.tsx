import { InfrastructureSubtabs } from '../Infrastructure/InfrastructureSubtabs';

export function InfrastructureTab() {
  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Infrastructure</h2>
      <InfrastructureSubtabs />
    </div>
  );
}
