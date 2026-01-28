import { useUIStore } from '../../stores';
import { StartTab } from '../tabs/StartTab';
import { RAGTab } from '../tabs/RAGTab';
import { ChatTab } from '../tabs/ChatTab';
import { EvaluationTab } from '../tabs/EvaluationTab';
import { EvalAnalysisTab } from '../tabs/EvalAnalysisTab';
import { GrafanaTab } from '../tabs/GrafanaTab';
import { GraphTab } from '../tabs/GraphTab';
import { InfrastructureTab } from '../tabs/InfrastructureTab';
import { AdminTab } from '../tabs/AdminTab';

export function TabRouter() {
  const activeTab = useUIStore((s) => s.activeTab);

  switch (activeTab) {
    case 'start':
      return <StartTab />;
    case 'rag':
      return <RAGTab />;
    case 'chat':
      return <ChatTab />;
    case 'evaluation':
      return <EvaluationTab />;
    case 'eval-analysis':
      return <EvalAnalysisTab />;
    case 'grafana':
      return <GrafanaTab />;
    case 'graph':
      return <GraphTab />;
    case 'infrastructure':
      return <InfrastructureTab />;
    case 'admin':
      return <AdminTab />;
    default:
      return <StartTab />;
  }
}
