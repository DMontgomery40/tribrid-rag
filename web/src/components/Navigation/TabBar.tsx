import { useUIStore } from '../../stores';

const TABS = [
  { id: 'start', label: 'Start' },
  { id: 'rag', label: 'RAG' },
  { id: 'chat', label: 'Chat' },
  { id: 'evaluation', label: 'Evaluation' },
  { id: 'eval-analysis', label: 'Analysis' },
  { id: 'grafana', label: 'Grafana' },
  { id: 'graph', label: 'Graph' },
  { id: 'infrastructure', label: 'Infrastructure' },
  { id: 'admin', label: 'Admin' },
];

export function TabBar() {
  const activeTab = useUIStore((s) => s.activeTab);
  const setActiveTab = useUIStore((s) => s.setActiveTab);

  return (
    <nav className="flex border-b border-gray-200 dark:border-gray-700">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className={`tribrid-tab px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === tab.id
              ? 'tribrid-tab-active border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
          onClick={() => setActiveTab(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
