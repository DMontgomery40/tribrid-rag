import { useState } from 'react';
import { ChatInterface } from './ChatInterface';
import { ChatSettings } from './ChatSettings';
import { useRepoStore } from '../../stores';

const SUBTABS = [
  { id: 'chat', label: 'Chat' },
  { id: 'settings', label: 'Settings' },
];

export function ChatSubtabs() {
  const [activeSubtab, setActiveSubtab] = useState('chat');
  const activeRepoId = useRepoStore((s) => s.activeRepoId);

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
        {activeSubtab === 'chat' && activeRepoId && (
          <ChatInterface repoId={activeRepoId} />
        )}
        {activeSubtab === 'settings' && <ChatSettings />}
        {!activeRepoId && (
          <div className="p-4 text-gray-500">Select a repository to start chatting</div>
        )}
      </div>
    </div>
  );
}
