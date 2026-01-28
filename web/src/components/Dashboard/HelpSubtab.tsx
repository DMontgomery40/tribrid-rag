export function HelpSubtab() {
  return (
    <div className="space-y-4">
      <div className="tribrid-card p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h4 className="font-medium mb-2">Getting Started</h4>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <li>Add a repository using the Repos panel</li>
          <li>Configure embedding settings in RAG &gt; Config</li>
          <li>Index your repository</li>
          <li>Start searching or chatting!</li>
        </ol>
      </div>

      <div className="tribrid-card p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h4 className="font-medium mb-2">Key Features</h4>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li>Vector search (semantic similarity)</li>
          <li>Sparse search (BM25 keyword matching)</li>
          <li>Graph search (entity relationships)</li>
          <li>Hybrid fusion with configurable weights</li>
          <li>Learning reranker for continuous improvement</li>
        </ul>
      </div>
    </div>
  );
}
