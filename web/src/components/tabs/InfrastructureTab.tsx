// TriBridRAG - Infrastructure Tab Component (React)
// Main Infrastructure configuration tab with subtab navigation
// Structure matches /gui/index.html exactly with all subtabs rendered and visibility controlled by className

import { useSubtab } from '@/hooks';
import { InfrastructureSubtabs } from '@/components/Infrastructure/InfrastructureSubtabs';
import { ServicesSubtab } from '@/components/Infrastructure/ServicesSubtab';
import { DockerSubtab } from '@/components/Infrastructure/DockerSubtab';
import { MCPSubtab } from '@/components/Infrastructure/MCPSubtab';
import { PathsSubtab } from '@/components/Infrastructure/PathsSubtab';
import { MonitoringSubtab } from '@/components/Infrastructure/MonitoringSubtab';

export default function InfrastructureTab() {
  const { activeSubtab, setSubtab } = useSubtab<string>({ routePath: '/infrastructure', defaultSubtab: 'services' });

  return (
    <div id="tab-infrastructure" className="tab-content">
      {/* Subtab navigation */}
      <InfrastructureSubtabs activeSubtab={activeSubtab} onSubtabChange={setSubtab} />

      {/* All subtabs rendered with visibility controlled by display style */}
      <div
        id="tab-infrastructure-services"
        className={`infrastructure-subtab-content ${activeSubtab === 'services' ? 'active' : ''}`}
        style={{ display: activeSubtab === 'services' ? 'block' : 'none' }}
      >
        <ServicesSubtab />
      </div>

      <div
        id="tab-infrastructure-docker"
        className={`infrastructure-subtab-content ${activeSubtab === 'docker' ? 'active' : ''}`}
        style={{ display: activeSubtab === 'docker' ? 'block' : 'none' }}
      >
        <DockerSubtab />
      </div>

      <div
        id="tab-infrastructure-mcp"
        className={`infrastructure-subtab-content ${activeSubtab === 'mcp' ? 'active' : ''}`}
        style={{ display: activeSubtab === 'mcp' ? 'block' : 'none' }}
      >
        <MCPSubtab />
      </div>

      <div
        id="tab-infrastructure-paths"
        className={`infrastructure-subtab-content ${activeSubtab === 'paths' ? 'active' : ''}`}
        style={{ display: activeSubtab === 'paths' ? 'block' : 'none' }}
      >
        <PathsSubtab />
      </div>

      <div
        id="tab-infrastructure-monitoring"
        className={`infrastructure-subtab-content ${activeSubtab === 'monitoring' ? 'active' : ''}`}
        style={{ display: activeSubtab === 'monitoring' ? 'block' : 'none' }}
      >
        <MonitoringSubtab />
      </div>
    </div>
  );
}
