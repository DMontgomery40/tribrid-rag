import { RAGSubtabs } from '../RAG/RAGSubtabs';

export function RAGTab() {
  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">RAG Configuration</h2>
      <RAGSubtabs />
    </div>
  );
}
