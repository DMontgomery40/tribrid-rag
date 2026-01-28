import { useState } from 'react';
import { IndexingSubtab } from './IndexingSubtab';
import { RetrievalSubtab } from './RetrievalSubtab';
import { RerankerConfigSubtab } from './RerankerConfigSubtab';
import { LearningRerankerSubtab } from './LearningRerankerSubtab';
import { EvaluateSubtab } from './EvaluateSubtab';
import { DataQualitySubtab } from './DataQualitySubtab';

const SUBTABS = [
  { id: 'indexing', label: 'Indexing' },
  { id: 'retrieval', label: 'Retrieval' },
  { id: 'reranker', label: 'Reranker' },
  { id: 'learning', label: 'Learning' },
  { id: 'evaluate', label: 'Evaluate' },
  { id: 'quality', label: 'Data Quality' },
];

export function RAGSubtabs() {
  const [activeSubtab, setActiveSubtab] = useState('indexing');

  return (
    <div>
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4 overflow-x-auto">
        {SUBTABS.map((tab) => (
          <button
            key={tab.id}
            className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${
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
      {activeSubtab === 'indexing' && <IndexingSubtab />}
      {activeSubtab === 'retrieval' && <RetrievalSubtab />}
      {activeSubtab === 'reranker' && <RerankerConfigSubtab />}
      {activeSubtab === 'learning' && <LearningRerankerSubtab />}
      {activeSubtab === 'evaluate' && <EvaluateSubtab />}
      {activeSubtab === 'quality' && <DataQualitySubtab />}
    </div>
  );
}
