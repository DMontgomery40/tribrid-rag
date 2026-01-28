import { useState } from 'react';
import { DockerSubtab } from './DockerSubtab';
import { ServicesSubtab } from './ServicesSubtab';
import { PathsSubtab } from './PathsSubtab';

const SUBTABS = [
  { id: 'docker', label: 'Docker' },
  { id: 'services', label: 'Services' },
  { id: 'paths', label: 'Paths' },
];

export function InfrastructureSubtabs() {
  const [activeSubtab, setActiveSubtab] = useState('docker');

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
      {activeSubtab === 'docker' && <DockerSubtab />}
      {activeSubtab === 'services' && <ServicesSubtab />}
      {activeSubtab === 'paths' && <PathsSubtab />}
    </div>
  );
}
