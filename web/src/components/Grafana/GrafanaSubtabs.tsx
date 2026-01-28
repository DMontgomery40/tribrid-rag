import { useState } from 'react';
import { GrafanaDashboard } from './GrafanaDashboard';
import { GrafanaConfig } from './GrafanaConfig';

const SUBTABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'config', label: 'Config' },
];

export function GrafanaSubtabs() {
  const [activeSubtab, setActiveSubtab] = useState('dashboard');

  return (
    <div className="h-full flex flex-col">
      <div className="flex border-b border-gray-200 dark:border-gray-700">
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
      <div className="flex-1 overflow-hidden">
        {activeSubtab === 'dashboard' && <GrafanaDashboard />}
        {activeSubtab === 'config' && <GrafanaConfig />}
      </div>
    </div>
  );
}
