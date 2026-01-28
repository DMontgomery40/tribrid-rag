import { useState } from 'react';
import { SystemStatusSubtab } from './SystemStatusSubtab';
import { StorageSubtab } from './StorageSubtab';
import { MonitoringSubtab } from './MonitoringSubtab';
import { HelpSubtab } from './HelpSubtab';
import { GlossarySubtab } from './GlossarySubtab';

const SUBTABS = [
  { id: 'status', label: 'System Status' },
  { id: 'storage', label: 'Storage' },
  { id: 'monitoring', label: 'Monitoring' },
  { id: 'help', label: 'Help' },
  { id: 'glossary', label: 'Glossary' },
];

export function DashboardSubtabs() {
  const [activeSubtab, setActiveSubtab] = useState('status');

  return (
    <div>
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
        {SUBTABS.map((tab) => (
          <button
            key={tab.id}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeSubtab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveSubtab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeSubtab === 'status' && <SystemStatusSubtab />}
      {activeSubtab === 'storage' && <StorageSubtab />}
      {activeSubtab === 'monitoring' && <MonitoringSubtab />}
      {activeSubtab === 'help' && <HelpSubtab />}
      {activeSubtab === 'glossary' && <GlossarySubtab />}
    </div>
  );
}
